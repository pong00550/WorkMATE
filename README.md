# Pong WorkMate 1.0 PWA Prototype

นี่คือ Frontend ใหม่แบบ PWA แยกจาก Google Apps Script HTML Service

## ตอนนี้ทำอะไรได้
- Home dashboard
- Tasks
- Expenses
- Quick Add
- Mobile bottom navigation
- ติดตั้งเป็น PWA เมื่อโฮสต์บน HTTPS
- ทำงาน offline เบื้องต้น
- ข้อมูล Prototype เก็บใน localStorage ของเครื่อง

## สำคัญ
เวอร์ชันนี้ยังไม่ได้ Sync กับ Google Sheets v0.6
ตั้งใจแยก UX ให้ใช้งานบนมือถือได้จริงก่อน แล้วขั้นถัดไปค่อยเชื่อม Cloud backend

## วิธีทดลองบนคอม
เปิดด้วย local web server เช่น VS Code Live Server
(เปิด index.html ตรง ๆ จะทำให้ service worker ไม่ทำงาน)

## วิธีทดลองบน iPhone แบบติดตั้งจริง
ต้องโฮสต์ผ่าน HTTPS เช่น GitHub Pages / Firebase Hosting / Cloudflare Pages
จากนั้นเปิด URL ใน Safari และใช้ Add to Home Screen

## ขั้นต่อไป
1. ทดลอง UX บนมือถือ
2. เพิ่ม Edit/Delete
3. เลือก Backend:
   - Firebase / Supabase (เหมาะกับ PWA จริง)
   - หรือทำ API bridge จากระบบ Google เดิม
4. ย้ายข้อมูล Tasks/Expenses จาก Google Sheets เดิม
5. เชื่อม Receipt upload / Calendar / AI
