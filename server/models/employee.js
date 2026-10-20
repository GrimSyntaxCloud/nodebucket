/*
============================================
 Title: employee.js
 Author: Andres Macias
 Date:   01/16/23
 Description: contains employee model
===========================================
*/

const mongoose = require('mongoose');
const itemSchema = require('./item');

const Schema = mongoose.Schema;

/**
 * Description: creates an employee schema to be used in the employee model
 * empId: unique employee id number (required)
 * todo: array of items to be completed
 * done: array of items that have been completed
 * collection: name of the collection in the database
 */
let employeeSchema = new Schema({
  empId: {type: Number, required: true},
  firstName: { type: String },
  lastName: { type: String },
  todo: [itemSchema],
  done: [itemSchema]
}, {collection: 'employees', optimisticConcurrency: true, autoCreate: false, autoIndex: false})

module.exports = mongoose.model('Employee', employeeSchema);
