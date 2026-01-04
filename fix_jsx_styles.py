import os
import re

# Lista de arquivos para corrigir
files_to_fix = [
    r'c:\Users\Maycon\Downloads\glucoai\components\ui\BottomSheet.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\ui\StepperInput.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\ui\SelectableTile.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\ui\Popover.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\ui\InfoTooltip.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\QuestionnaireWizard.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\LoginPremium.tsx',
    r'c:\Users\Maycon\Downloads\glucoai\components\examples\InfoTooltipExample.tsx'
]

fixed_count = 0

for filepath in files_to_fix:
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Substituir <style jsx> por <style>
            new_content = content.replace('<style jsx>', '<style>')
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✅ Fixed: {os.path.basename(filepath)}")
                fixed_count += 1
            else:
                print(f"⏭️  Skipped (already fixed): {os.path.basename(filepath)}")
        except Exception as e:
            print(f"❌ Error fixing {os.path.basename(filepath)}: {e}")
    else:
        print(f"⚠️  File not found: {filepath}")

print(f"\n✅ Total files fixed: {fixed_count}")
