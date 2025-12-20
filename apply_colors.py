# Script para aplicar cores mint/teal
import re

# Ler Dashboard.tsx
with open(r'c:\Users\Maycon\Downloads\glucoai\components\Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituições
replacements = [
    ('bg-[#029491]', 'bg-[#4DB8A8]'),
    ('shadow-[#0d4a4b]', 'shadow-[#3DA89A]'),
    ('text-[#18A6A4]', 'text-[#4DB8A8]'),
    ('hover:bg-[#027370]', 'hover:bg-[#3DA89A]'),
    ('bg-[#E0F2F1]', 'bg-white border-2 border-[#4DB8A8]'),
    ('hover:bg-[#B2DFDB]', 'hover:bg-[#4DB8A8]/10'),
]

for old, new in replacements:
    content = content.replace(old, new)

# Salvar
with open(r'c:\Users\Maycon\Downloads\glucoai\components\Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard.tsx atualizado!")

# Ler NavbarXP.tsx
with open(r'c:\Users\Maycon\Downloads\glucoai\components\NavbarXP.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements_navbar = [
    ('bg-[#029491]', 'bg-[#4DB8A8]'),
    ('hover:bg-[#027370]', 'hover:bg-[#3DA89A]'),
    ('bg-[#18A6A4]', 'bg-[#4DB8A8]'),
    ('text-[#18A6A4]', 'text-[#4DB8A8]'),
]

for old, new in replacements_navbar:
    content = content.replace(old, new)

with open(r'c:\Users\Maycon\Downloads\glucoai\components\NavbarXP.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("NavbarXP.tsx atualizado!")

# Ler ProfileCompletionCard.tsx
with open(r'c:\Users\Maycon\Downloads\glucoai\components\ProfileCompletionCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements_profile = [
    ('bg-[#029491]', 'bg-[#4DB8A8]'),
    ('hover:bg-[#027370]', 'hover:bg-[#3DA89A]'),
    ('bg-[#18A6A4]', 'bg-[#4DB8A8]'),
]

for old, new in replacements_profile:
    content = content.replace(old, new)

with open(r'c:\Users\Maycon\Downloads\glucoai\components\ProfileCompletionCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ProfileCompletionCard.tsx atualizado!")

# Ler GlucoseChart.tsx
with open(r'c:\Users\Maycon\Downloads\glucoai\components\GlucoseChart.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements_chart = [
    ('stroke="#0ea5e9"', 'stroke="#4DB8A8"'),
    ('fill="#0ea5e9"', 'fill="#4DB8A8"'),
    ('bg-blue-500', 'bg-[#4DB8A8]'),
    ('text-blue-600', 'text-[#4DB8A8]'),
]

for old, new in replacements_chart:
    content = content.replace(old, new)

with open(r'c:\Users\Maycon\Downloads\glucoai\components\GlucoseChart.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("GlucoseChart.tsx atualizado!")
print("Todas as cores aplicadas com sucesso!")
