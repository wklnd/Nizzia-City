const Item = require('../models/Item');
const itemService = require('../services/itemService');

const getItemMeta = async (req, res) => {
  const typePath = Item.schema.path('type');
  const type2Path = Item.schema.path('type2');
  res.json({
    types: Array.isArray(typePath?.enumValues) ? typePath.enumValues : [],
    subtypes: Array.isArray(type2Path?.enumValues) ? type2Path.enumValues : [],
  });
};

const getAllItems = async (req, res) => {
  const items = await Item.find();
  res.json(items);
};

const useItem = async (req, res) => {
  const userId = req.authUserId;
  const { itemId } = req.body;
  try {
    const result = await itemService.applyItem(userId, itemId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const createItem = async (req, res) => {
  const {
    name,
    type,
    id,
    description,
    effect,
    overdoseEffect,
    passiveEffect,
    type2,
    damage,
    armor,
    coverage,
    quality,
    price,
    sellable,
    usable
  } = req.body;

  try {
    // Base fields
    const payload = {
      name,
      type,
      id,
      description,
      price,
      sellable,
      usable
    };

    // Per‐type additions
    if (['medicine','alchool','enhancers','drugs','cache'].includes(type)) {
      payload.effect = effect || {};
    }
    if (['alchool','drugs'].includes(type)) {
      payload.overdoseEffect = overdoseEffect || {};
    }
    if (['tools','collectibles'].includes(type)) {
      payload.passiveEffect = passiveEffect || {};
    }
    if (['weapon','armor','clothes'].includes(type) && type2) {
      payload.type2 = type2;
    }
    if (type === 'weapon') {
      payload.damage = Number(damage) || 0;
      payload.quality = Number(quality) || 0;
    }
    if (type === 'armor') {
      payload.armor = Number(armor) || 0;
      payload.coverage = Number(coverage) || 100;
      payload.quality = Number(quality) || 0;
    }

    const newItem = new Item(payload);
    await newItem.save();

    return res.status(201).json(newItem);
  } catch (err) {
    console.error('Failed to create item:', err);
    return res.status(400).json({ error: err.message });
  }
};

const updateItem = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    description,
    effect,
    overdoseEffect,
    passiveEffect,
    type2,
    damage,
    armor,
    coverage,
    quality,
    price,
    sellable,
    usable
  } = req.body;

  try {
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update base fields
    if (name !== undefined) item.name = name;
    if (type !== undefined) item.type = type;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (sellable !== undefined) item.sellable = sellable;
    if (usable !== undefined) item.usable = usable;

    // Update type-specific fields
    if (['medicine','alchool','enhancers','drugs','cache'].includes(type)) {
      item.effect = effect || {};
    }
    if (['alchool','drugs'].includes(type)) {
      item.overdoseEffect = overdoseEffect || {};
    }
    if (['tools','collectibles'].includes(type)) {
      item.passiveEffect = passiveEffect || {};
    }
    if (['weapon','armor','clothes'].includes(type)) {
      if (type2 !== undefined) item.type2 = type2;
    }
    if (type === 'weapon') {
      if (damage !== undefined) item.damage = Number(damage) || 0;
      if (quality !== undefined) item.quality = Number(quality) || 0;
    }
    if (type === 'armor') {
      if (armor !== undefined) item.armor = Number(armor) || 0;
      if (coverage !== undefined) item.coverage = Number(coverage) || 100;
      if (quality !== undefined) item.quality = Number(quality) || 0;
    }

    await item.save();
    return res.json(item);
  } catch (err) {
    console.error('Failed to update item:', err);
    return res.status(400).json({ error: err.message });
  }
};

const deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(deletedItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const downloadAllItems = async () => {
  const items = await Item.find();
  const fs = require('fs');
  fs.writeFileSync('all_items.json', JSON.stringify(items, null, 2));
}

module.exports = { getAllItems, getItemMeta, useItem, createItem, updateItem, deleteItem, downloadAllItems };