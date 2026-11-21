---
name: songyun-illustrated-novel
description: Produce and resume the Songyun illustrated Thai novel. Use for character continuity sheets, scene illustrations placed inside chapters, rebuilding the reader from unchanged source text, and checking a requested GitHub Pages release. For extracting new chapters from Dek-D, use dek-d-text-extractor.
---

# นิยายภาพคุณหนูใหญ่ซ่งอวิ๋น

ทำงานจากรากโปรเจกต์ Songyun ต้นฉบับอยู่ใน `content/` ใช้ข้อความและปกจากไฟล์เหล่านี้ตามเดิม ตัวสร้างหน้าอ่านจะแทรกภาพตามแผนใน `production/` โดยมีภาพตรงฉากอย่างน้อย 5 ภาพต่อตอน

เริ่มงานหรือกลับมาทำต่อด้วยการตรวจไฟล์จริง สคริปต์รายงานชีตและลำดับภาพที่ยังขาดตามแผนปัจจุบัน

```powershell
py -3 -X utf8 .agents/skills/songyun-illustrated-novel/scripts/check_assets.py
```

- เมื่อต้องสร้างชีตตัวละคร วางตำแหน่งภาพ หรือเจนภาพต่อ ให้อ่าน [การทำภาพประกอบ](references/illustrations.md)
- เมื่อต้องกลับมาทำชุดที่ค้าง ให้อ่าน [รายการภาพที่ค้าง](references/remaining-illustrations.md) แล้วเทียบกับผลตรวจไฟล์ล่าสุด
- เมื่อต้องเปิดหน้าอ่าน ตรวจต้นฉบับ หรือพุชขึ้น `main` ตามที่ผู้ใช้ขอ ให้อ่าน [การสร้างและเผยแพร่หน้าอ่าน](references/reader-release.md)
- เมื่อต้องนำเข้าตอนใหม่จาก Dek-D ให้ใช้ [dek-d-text-extractor](../dek-d-text-extractor/SKILL.md)
