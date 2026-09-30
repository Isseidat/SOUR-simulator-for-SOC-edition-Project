import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, 
  subject: { type: String, required: true },           
  body: { type: String, required: true },               
  recipients: { type: [String], default: [] },          
  cc: { type: [String], default: [] }                   
}, { timestamps: true });

export const EmailTemplate = mongoose.model('EmailTemplate', templateSchema);