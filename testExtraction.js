// Simple test runner (no dependencies)
// Run: node testExtraction.js

const { extractGlucose, extractInsulin, extractMeal } = require('./services/extractionService');

console.log('\n🧪 Testing Extraction Service\n');

// Test glucose
console.log('📊 Glucose Tests:');
const glucoseTests = [
    "minha glicemia atual é 201",
    "glicose tá 150",
    "medí 180",
    "201",
    "gli 220"
];

glucoseTests.forEach(test => {
    const result = extractGlucose(test);
    console.log(`  "${test}" → ${result?.value || 'null'} (${result?.confidence.toFixed(2) || 'N/A'})`);
});

// Test insulin
console.log('\n💉 Insulin Tests:');
const insulinTests = [
    "apliquei 10u",
    "tomei 5 unidades",
    "dei 8u de rápida",
    "basal 20u"
];

insulinTests.forEach(test => {
    const result = extractInsulin(test);
    console.log(`  "${test}" → ${result?.units || 'null'}u ${result?.type || ''} (${result?.confidence.toFixed(2) || 'N/A'})`);
});

// Test meals
console.log('\n🍽️  Meal Tests:');
const mealTests = [
    { text: "comi pizza", hasImage: false },
    { text: "almocei agora", hasImage: false },
    { text: "foto", hasImage: true }
];

mealTests.forEach(test => {
    const result = extractMeal(test.text, test.hasImage);
    console.log(`  "${test.text}" ${test.hasImage ? '📷' : ''} → "${result?.description || 'null'}" (${result?.confidence.toFixed(2) || 'N/A'})`);
});

console.log('\n✅ Tests completed!\n');
