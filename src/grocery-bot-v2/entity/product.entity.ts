import mongoose from 'mongoose';

export interface Product {
  id?: number;
  name: string;
  brand: string;
  quantity: string;
  price: string;
  productId: number;
  barcode: string;
  category: string;
  subCategory: string;
  searchKeywords: Array<String>;
}

export const ProductSchema = new mongoose.Schema({
  id: Number,
  name: String,
  brand: String,
  quantity: String,
  price: String,
  productId: Number,
  barcode: String,
  category: String,
  subCategory: String,
  searchKeywords: Array<String>,
});
