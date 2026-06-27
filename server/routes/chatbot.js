const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Secure route using JWT authentication
router.use(auth);

// POST /api/chatbot
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message query is required' });
    }

    const query = message.trim().toLowerCase();
    const userId = req.user.id;

    // Fetch up-to-date database entities
    const batches = await db.getAllBatches();
    const settings = await db.getUserSettings(userId);
    const threshold = settings.reminder_threshold_days || 5;

    let replyText = '';
    let responseType = 'general';
    let matchedBatches = [];

    // Intent 1: FEFO Logic / Which batch should I use first?
    if (
      query.includes('use first') || 
      query.includes('which batch') || 
      query.includes('fefo') || 
      query.includes('earliest expiry') ||
      query.includes('what batch')
    ) {
      responseType = 'fefo';
      
      // Group active batches (stock > 0 and not expired) by product name
      const activeBatches = batches.filter(b => b.quantity > 0 && b.remaining_days >= 0);
      const productGroups = {};
      
      activeBatches.forEach(b => {
        if (!productGroups[b.product_name]) {
          productGroups[b.product_name] = [];
        }
        productGroups[b.product_name].push(b);
      });

      const fefoRecommendations = [];
      replyText = "### First Expiry First Out (FEFO) Recommendations\n\nTo minimize waste, please prioritize utilizing the following batches first:\n\n";

      Object.keys(productGroups).forEach(pName => {
        // Sort batches in ascending order of remaining days (earliest expiry first)
        const sorted = productGroups[pName].sort((a, b) => a.remaining_days - b.remaining_days);
        const nextBatch = sorted[0];
        fefoRecommendations.push(nextBatch);
        
        const bNum = nextBatch.batch_number || `B-BATCH-${nextBatch.id.toString().padStart(3, '0')}`;
        const daysLeftText = nextBatch.remaining_days === 0 ? 'expires today' : `expires in **${nextBatch.remaining_days} days**`;
        replyText += `- **${pName}**: Use **${bNum}** first (${daysLeftText}, **${nextBatch.quantity}** units remaining).\n`;
      });

      if (fefoRecommendations.length === 0) {
        replyText = "There are no active batches with stock to suggest using first.";
      } else {
        matchedBatches = fefoRecommendations;
      }
    }
    // Intent 2: Expired Items
    else if (query.includes('expired')) {
      responseType = 'expired';
      matchedBatches = batches.filter(b => b.remaining_days < 0);
      if (matchedBatches.length === 0) {
        replyText = "Good news! There are no expired items in your inventory currently.";
      } else {
        replyText = `I found **${matchedBatches.length} expired item(s)**. These must be discarded immediately to maintain inventory safety.`;
      }
    } 
    // Intent 3: Near Expiry Items
    else if (
      query.includes('near expiry') || 
      query.includes('near-expiry') || 
      query.includes('expiring') || 
      query.includes('expiry soon')
    ) {
      responseType = 'near_expiry';
      matchedBatches = batches.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold);
      if (matchedBatches.length === 0) {
        replyText = `Excellent! There are no items near expiry (warning threshold is set to **${threshold} days**).`;
      } else {
        replyText = `There are **${matchedBatches.length} item(s) near expiry** (within your **${threshold} days** threshold). Please prioritize utilizing or dispatching them.`;
      }
    } 
    // Intent 4: Recommendations / What should I do now?
    else if (
      query.includes('what should i do') || 
      query.includes('what now') || 
      query.includes('suggestions') || 
      query.includes('recommendations') || 
      query.includes('action')
    ) {
      responseType = 'suggestions';
      const expiredCount = batches.filter(b => b.remaining_days < 0).length;
      const nearExpiryCount = batches.filter(b => b.remaining_days >= 0 && b.remaining_days <= threshold).length;
 
      if (expiredCount === 0 && nearExpiryCount === 0) {
        replyText = "All systems clear! No items are expired or near expiry. No immediate action is required.";
      } else {
        replyText = "Here are your recommended actions:\n\n";
        if (expiredCount > 0) {
          replyText += `🚨 **Discard Expired Batches:** You have **${expiredCount} expired batch(es)**. Dispose of them immediately to prevent safety issues.\n`;
        }
        if (nearExpiryCount > 0) {
          replyText += `⚠️ **Prioritize Near Expiry:** There are **${nearExpiryCount} batch(es)** expiring within **${threshold} days**. Move them to the front of stock or prepare for immediate dispatch.\n`;
        }
      }
    } 
    // Fallback: General instructions
    else {
      replyText = `Hello! I am your Shelf Life Assistant. I can help you query your stock details and reminders.
 
You can ask me questions like:
- **"Which batch should I use first?"**
- **"Show near-expiry batches"**
- **"List expired items"**
- **"What should I do now?"**`;
    }

    // Map matched batches to clean representations for UI cards
    const mappedBatches = matchedBatches.map(b => ({
      id: b.id,
      product_name: b.product_name,
      category: b.category,
      batch_number: b.batch_number || `B-BATCH-${b.id.toString().padStart(3, '0')}`,
      expiry_date: b.expiry_date,
      quantity: b.quantity,
      remaining_days: b.remaining_days,
      status: b.status
    }));

    return res.json({
      reply: replyText,
      type: responseType,
      batches: mappedBatches
    });

  } catch (error) {
    console.error('Chatbot Route Error:', error);
    return res.status(500).json({ message: 'Internal server error while processing query' });
  }
});

module.exports = router;
