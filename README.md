# Pong WorkMate 1.1 — Cloud Sync

## เป้าหมาย
ใช้ Google Account เดียวกันบน iPhone และคอม แล้วเห็น Tasks / Expenses ชุดเดียวกันแบบ real-time

## เพิ่มจาก 1.0
- Google Sign-in
- Cloud Firestore real-time sync
- More / Account page
- สถานะ Cloud Sync
- ย้ายข้อมูล localStorage จาก v1.0 ขึ้น Cloud อัตโนมัติครั้งแรก
- localStorage ยังทำหน้าที่เป็น cache

---

# ตั้งค่า Firebase

## 1) สร้าง Firebase Project
เข้า Firebase Console แล้วสร้าง Project เช่น:
Pong WorkMate

Google Analytics จะเปิดหรือไม่เปิดก็ได้สำหรับโปรเจกต์นี้

## 2) Register Web App
Project Overview > Add app > Web

ตั้งชื่อ:
Pong WorkMate Web

Firebase จะแสดง firebaseConfig ประมาณ:
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
};

เปิดไฟล์:
firebase-config.js

แล้วแทนค่า placeholder ด้วยค่าของคุณ

## 3) เปิด Google Authentication
Firebase Console > Authentication > Get started
Sign-in method > Google > Enable > Save

จากนั้น:
Authentication > Settings > Authorized domains

เพิ่ม domain GitHub Pages ของคุณ เช่น:
yourusername.github.io

ใส่เฉพาะ domain ไม่ต้องใส่:
https://
หรือ
/pong-workmate/

## 4) สร้าง Firestore Database
Firebase Console > Firestore Database > Create database

เลือกรูปแบบ Standard / Production ตามหน้าที่ Firebase แสดง
เลือก Location ที่ต้องการ

## 5) ใส่ Security Rules
Firestore Database > Rules

ลบของเดิม แล้ว Copy ทั้งไฟล์:
firestore.rules

ไปวาง จากนั้น Publish

โครงสร้างข้อมูลจะเป็น:
users/{uid}/tasks/{taskId}
users/{uid}/expenses/{expenseId}

แต่ละบัญชี Google จะอ่าน/เขียนได้เฉพาะข้อมูลของตัวเอง

## 6) Update GitHub
Upload ไฟล์ v1.1 ไปแทน v1.0:
- index.html
- styles.css
- app.js
- firebase-config.js
- manifest.json
- sw.js
- icons/

ไฟล์ firestore.rules เก็บใน GitHub ได้ แต่การใช้งานจริงต้อง Publish ที่ Firebase Console ตามข้อ 5

## 7) รอ GitHub Pages Deploy
เปิดเว็บใหม่อีกครั้ง

ถ้าเคย Add to Home Screen:
- เปิดแอปหนึ่งครั้งให้โหลด v1.1
- ถ้ายังเห็นเวอร์ชันเก่า ให้ปิดแอปแล้วเปิดใหม่
- หรือเปิด URL จาก Safari ก่อน 1 รอบ

## 8) Login
กด:
เข้าสู่ระบบด้วย Google

ใช้บัญชี Google เดียวกันบน:
- iPhone
- Computer

จากนั้น Tasks / Expenses จะ Sync กันแบบ real-time

---

# การย้ายข้อมูลจาก v1.0
ครั้งแรกที่ Login:
- App จะอ่านข้อความ Tasks / Expenses ที่อยู่ใน localStorage
- Upload ขึ้น Firestore
- จากนั้นจะใช้ Cloud เป็นข้อมูลหลัก

แนะนำให้เปิด v1.1 ครั้งแรกบนอุปกรณ์ที่มีข้อมูล v1.0 ที่คุณต้องการเก็บ

---

# สำคัญด้านความปลอดภัย
firebaseConfig เป็น config ฝั่งเว็บและไม่ใช่รหัสผ่านลับ
สิ่งที่ป้องกันข้อมูลคือ:
1. Firebase Authentication
2. Firestore Security Rules

ห้ามใช้ rule แบบ:
allow read, write: if true;

สำหรับข้อมูลจริง
