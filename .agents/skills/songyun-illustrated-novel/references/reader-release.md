# การสร้างและเผยแพร่หน้าอ่าน

ทำงานจากรากโปรเจกต์ Songyun ให้ `content/chapter-NN.md`, `content/cover.md` และ `content/cover.webp` เป็นต้นฉบับสำหรับหน้าอ่าน ชื่อเรื่องรายตอนอยู่ใน `production/titles.json` ตำแหน่งภาพมาจากแผนรายตอน

สร้างหน้าอ่านในเครื่องเพื่อดูภาพที่มีอยู่ แล้วเปิด `index.html` หรือ `read/NN.html`

```powershell
py -3 -X utf8 tools/build_reader.py
```

เมื่อภาพครบ ให้ตรวจรายการชีตและภาพตามแผน แล้วใช้โหมดที่กำหนดว่าภาพต้องครบ

```powershell
py -3 -X utf8 .agents/skills/songyun-illustrated-novel/scripts/check_assets.py --require-complete
py -3 -X utf8 tools/build_reader.py --require-art
```

เทียบข้อความใน `p[data-source]` ของหน้า HTML กับย่อหน้าที่มีข้อความใน Markdown ตรวจว่าภาพแต่ละภาพอยู่หลังย่อหน้า `after` เปิดได้จริง มีคำบรรยาย `alt` และแต่ละตอนมีภาพอย่างน้อย 5 ภาพ เปิดหน้าอ่านบนจอใหญ่กับมือถือเพื่อตรวจสารบัญ การเปลี่ยนตอน และขนาดตัวอักษร

เมื่อคำขอครอบคลุมการเผยแพร่ ให้ตรวจปลายทางและ diff ก่อนจึง commit และพุช `main` ตามปกติ โปรเจกต์นี้ใช้ `https://github.com/sahachartksm/test.git` และ GitHub Pages ที่ `https://sahachartksm.github.io/test/` หลังพุชให้เทียบ SHA ของปลายทางและเปิดหน้าเว็บกับหน้าตอนตัวอย่างเพื่อยืนยันผล
