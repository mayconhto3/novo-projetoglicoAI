const fs = require('fs');
const path = require('path');

const files = [
    'components/ui/BottomSheet.tsx',
    'components/ui/StepperInput.tsx',
    'components/ui/SelectableTile.tsx',
    'components/ui/Popover.tsx',
    'components/ui/InfoTooltip.tsx',
    'components/QuestionnaireWizard.tsx',
    'components/LoginPremium.tsx',
    'components/examples/InfoTooltipExample.tsx'
];

let fixed = 0;

files.forEach(file => {
    const filepath = path.join(__dirname, file);
    if (fs.existsSync(filepath)) {
        try {
            let content = fs.readFileSync(filepath, 'utf8');
            const newContent = content.replace(/<style jsx>/g, '<style>');

            if (newContent !== content) {
                fs.writeFileSync(filepath, newContent, 'utf8');
                console.log(`✅ Fixed: ${file}`);
                fixed++;
            } else {
                console.log(`⏭️  Already fixed: ${file}`);
            }
        } catch (e) {
            console.log(`❌ Error: ${file} - ${e.message}`);
        }
    } else {
        console.log(`⚠️  Not found: ${file}`);
    }
});

console.log(`\n✅ Total fixed: ${fixed}`);
