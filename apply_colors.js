const fs = require('fs');

// Função para aplicar substituições
function applyReplacements(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');

    replacements.forEach(([old, newVal]) => {
        content = content.split(old).join(newVal);
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath} atualizado!`);
}

// Dashboard.tsx
applyReplacements('c:\\Users\\Maycon\\Downloads\\glucoai\\components\\Dashboard.tsx', [
    ['bg-[#029491]', 'bg-[#4DB8A8]'],
    ['shadow-[#0d4a4b]', 'shadow-[#3DA89A]'],
    ['text-[#18A6A4]', 'text-[#4DB8A8]'],
    ['hover:bg-[#027370]', 'hover:bg-[#3DA89A]'],
]);

// NavbarXP.tsx
applyReplacements('c:\\Users\\Maycon\\Downloads\\glucoai\\components\\NavbarXP.tsx', [
    ['bg-[#029491]', 'bg-[#4DB8A8]'],
    ['hover:bg-[#027370]', 'hover:bg-[#3DA89A]'],
    ['bg-[#18A6A4]', 'bg-[#4DB8A8]'],
    ['text-[#18A6A4]', 'text-[#4DB8A8]'],
]);

// ProfileCompletionCard.tsx
applyReplacements('c:\\Users\\Maycon\\Downloads\\glucoai\\components\\ProfileCompletionCard.tsx', [
    ['bg-[#029491]', 'bg-[#4DB8A8]'],
    ['hover:bg-[#027370]', 'hover:bg-[#3DA89A]'],
    ['bg-[#18A6A4]', 'bg-[#4DB8A8]'],
]);

// GlucoseChart.tsx
applyReplacements('c:\\Users\\Maycon\\Downloads\\glucoai\\components\\GlucoseChart.tsx', [
    ['stroke="#0ea5e9"', 'stroke="#4DB8A8"'],
    ['fill="#0ea5e9"', 'fill="#4DB8A8"'],
    ['bg-blue-500', 'bg-[#4DB8A8]'],
    ['text-blue-600', 'text-[#4DB8A8]'],
]);

console.log('\n🎨 Todas as cores aplicadas com sucesso!');
