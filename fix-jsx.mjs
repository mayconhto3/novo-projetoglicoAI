import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    const filepath = join(__dirname, file);
    if (existsSync(filepath)) {
        try {
            let content = readFileSync(filepath, 'utf8');
            const newContent = content.replace(/<style jsx>/g, '<style>');

            if (newContent !== content) {
                writeFileSync(filepath, newContent, 'utf8');
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
