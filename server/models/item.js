/*
============================================
 Title: item.js
 Author: Andres Macias
 Date:   01/16/23
 Description: create Item schema to be used in employee model
===========================================
*/

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Description: create Item schema to be used in employee model
let itemSchema = new Schema({
  text: { type: String, required: true, minlength: 3, maxlength: 35 }
})

module.exports = itemSchema;
