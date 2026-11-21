---
name: dek-d-text-extractor
description: Extract authorized Dek-D novel chapters into UTF-8 Markdown and fix square glyphs in existing chapter exports. Use when asked to save the original wording from a Dek-D chapter URL.
---

# ดึงเนื้อเรื่องจาก Dek-D

ใช้ลิงก์รายตอน `writer.dek-d.com/.../writer/viewlongc.php?id=...&chapter=...` และพาธที่ผู้ใช้ระบุ ดึงเฉพาะตอนที่อยู่ในขอบเขตคำขอและสิทธิ์คัดลอกที่ผู้ใช้ยืนยันไว้

จากโฟลเดอร์ของ skill เรียกสคริปต์ [extract_chapter.py](scripts/extract_chapter.py) ด้วย Python 3 และ `curl` โดยใส่เครื่องหมายคำพูดรอบ URL ที่มี `&`

```powershell
py -3 .\scripts\extract_chapter.py 'https://writer.dek-d.com/author/writer/viewlongc.php?id=123&chapter=1' 'D:\Project\novel\chapter-01.md'
```

เพิ่ม `--overwrite` เมื่อผู้ใช้ขอให้แก้ไฟล์เดิม สคริปต์ดึงย่อหน้าจาก `#story-content` เก็บข้อความและช่องว่างตามต้นฉบับ แล้วตรวจผลก่อนบันทึกเป็น UTF-8

ถ้าข้อความแสดงเป็นสี่เหลี่ยม ให้ตรวจรหัส Unicode ก่อนเปลี่ยน encoding ฟอนต์เนื้อเรื่องของ Dek-D ใช้ `U+0E65` ถึง `U+0E79` แทน `U+0E01` ถึง `U+0E15` ซึ่งตรวจจากรูป glyph ของฟอนต์ Sarabun และ Maitree รุ่นปกติเทียบกับรุ่น `_content` สคริปต์แปลงเฉพาะรหัสช่วงนี้และเก็บอักขระอื่นตามหน้าเว็บ

ถ้าสคริปต์พบหน้าที่ไม่มีเนื้อเรื่อง โครงสร้างย่อหน้าต่างจากที่รองรับ หรืออักขระผิดปกติ ให้ตรวจหน้าและโครงสร้างที่ได้รับก่อนบันทึก ตรวจว่าจำนวนย่อหน้าและตัวอักษรในไฟล์ตรงกับต้นฉบับหลังแปลงรหัส แล้วแจ้งพาธไฟล์โดยไม่พิมพ์เนื้อเรื่องลงในแชต
