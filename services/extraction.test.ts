/**
 * Test Suite for Extraction Service
 * Run: npm test extraction.test.ts
 */

import {
    extractGlucose,
    extractInsulin,
    extractMeal,
    analyzeMessage,
    isValidGlucose,
    isValidInsulin
} from './extractionService';

// ============================================================================
// TEST CASES
// ============================================================================

const GLUCOSE_TEST_CASES = [
    // Variações naturais
    { input: "minha glicemia atual é 201", expected: 201, description: "Contexto completo" },
    { input: "glicose tá 150", expected: 150, description: "Informal" },
    { input: "medí e deu 180", expected: 180, description: "Verbo + resultado" },
    { input: "açúcar está 95", expected: 95, description: "Sinônimo" },
    { input: "gli 220", expected: 220, description: "Abreviação" },
    { input: "201", expected: 201, description: "Apenas número" },
    { input: "testei agora: 167", expected: 167, description: "Com pontuação" },
    { input: "glicemia muito alta 350", expected: 350, description: "Com adjetivo" },
    { input: "45 de glicose", expected: 45, description: "Número primeiro" },
    { input: "está 88 mg/dl", expected: 88, description: "Com unidade" },
    { input: "medi 120", expected: 120, description: "Verbo simples" },
    { input: "glicemia deu 99", expected: 99, description: "Deu resultado" },

    // Edge cases
    { input: "20", expected: 20, description: "Valor mínimo" },
    { input: "600", expected: 600, description: "Valor máximo" },
    { input: "19", expected: null, description: "Abaixo do mínimo" },
    { input: "601", expected: null, description: "Acima do máximo" },
];

const INSULIN_TEST_CASES = [
    // Variações naturais
    { input: "apliquei 10u", expected: { units: 10, type: 'rapid' }, description: "Aplicação direta" },
    { input: "tomei 5 unidades de insulina", expected: { units: 5 }, description: "Formal" },
    { input: "dei 8u de rápida", expected: { units: 8, type: 'rapid' }, description: "Tipo rápida" },
    { input: "basal de 20u", expected: { units: 20, type: 'basal' }, description: "Tipo basal" },
    { input: "fiz 12 unidades", expected: { units: 12 }, description: "Verbo fiz" },
    { input: "3.5u", expected: { units: 3.5 }, description: "Decimal com ponto" },
    { input: "3,5u", expected: { units: 3.5 }, description: "Decimal com vírgula" },
    { input: "lantus 15u", expected: { units: 15, type: 'basal' }, description: "Marca comercial" },
    { input: "novorapid 6u", expected: { units: 6, type: 'rapid' }, description: "Marca rápida" },
    { input: "usei 10 de insulina", expected: { units: 10 }, description: "Verbo usei" },

    // Edge cases
    { input: "0.5u", expected: { units: 0.5 }, description: "Mínimo" },
    { input: "100u", expected: { units: 100 }, description: "Máximo" },
    { input: "0.4u", expected: null, description: "Abaixo do mínimo" },
    { input: "101u", expected: null, description: "Acima do máximo" },
];

const MEAL_TEST_CASES = [
    // Variações naturais
    { input: "comi arroz e feijão", hasImage: false, expected: { description: "arroz e feijão" }, description: "Descrição completa" },
    { input: "almocei agora", hasImage: false, expected: { description: "agora" }, description: "Verbo + tempo" },
    { input: "jantar foi pizza", hasImage: false, expected: { description: "pizza" }, description: "Tipo + comida" },
    { input: "tomei café da manhã", hasImage: false, expected: { description: "café da manhã" }, description: "Refeição completa" },
    { input: "lanchei um pão", hasImage: false, expected: { description: "um pão" }, description: "Lanche" },
    { input: "foto da refeição", hasImage: true, expected: { description: "Refeição (via foto)" }, description: "Com imagem" },
    { input: "qualquer coisa", hasImage: true, expected: { description: "Refeição (via foto)" }, description: "Imagem prioritária" },
    { input: "comi pizza", hasImage: false, expected: { description: "pizza" }, description: "Comida comum" },
    { input: "frango com batata", hasImage: false, expected: { description: "frango" }, description: "Alimento detectado" },

    // Edge cases
    { input: "não comi nada", hasImage: false, expected: { description: "nada" }, description: "Negação" },
    { input: "", hasImage: true, expected: { description: "Refeição (via foto)" }, description: "Só imagem" },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

interface TestResult {
    passed: number;
    failed: number;
    total: number;
    details: Array<{
        category: string;
        input: string;
        description: string;
        passed: boolean;
        expected: any;
        got: any;
    }>;
}

function runTests(): TestResult {
    const result: TestResult = {
        passed: 0,
        failed: 0,
        total: 0,
        details: []
    };

    console.log('\n🧪 ============ EXTRACTION SERVICE TESTS ============\n');

    // Test Glucose
    console.log('📊 Testing Glucose Extraction...');
    for (const testCase of GLUCOSE_TEST_CASES) {
        result.total++;
        const extraction = extractGlucose(testCase.input);
        const got = extraction?.value || null;
        const passed = got === testCase.expected;

        if (passed) {
            result.passed++;
            console.log(`  ✅ "${testCase.input}" → ${got} (${testCase.description})`);
        } else {
            result.failed++;
            console.log(`  ❌ "${testCase.input}" (${testCase.description})`);
            console.log(`     Expected: ${testCase.expected}, Got: ${got}`);
        }

        result.details.push({
            category: 'glucose',
            input: testCase.input,
            description: testCase.description,
            passed,
            expected: testCase.expected,
            got
        });
    }

    // Test Insulin
    console.log('\n💉 Testing Insulin Extraction...');
    for (const testCase of INSULIN_TEST_CASES) {
        result.total++;
        const extraction = extractInsulin(testCase.input);
        const got = extraction ? { units: extraction.units, type: extraction.type } : null;

        // Compare apenas units se expected não tem type
        const passed = testCase.expected === null
            ? got === null
            : got !== null && got.units === testCase.expected.units &&
            (!testCase.expected.type || got.type === testCase.expected.type);

        if (passed) {
            result.passed++;
            console.log(`  ✅ "${testCase.input}" → ${got?.units}u ${got?.type || ''} (${testCase.description})`);
        } else {
            result.failed++;
            console.log(`  ❌ "${testCase.input}" (${testCase.description})`);
            console.log(`     Expected: ${JSON.stringify(testCase.expected)}, Got: ${JSON.stringify(got)}`);
        }

        result.details.push({
            category: 'insulin',
            input: testCase.input,
            description: testCase.description,
            passed,
            expected: testCase.expected,
            got
        });
    }

    // Test Meals
    console.log('\n🍽️  Testing Meal Extraction...');
    for (const testCase of MEAL_TEST_CASES) {
        result.total++;
        const extraction = extractMeal(testCase.input, testCase.hasImage);
        const got = extraction ? { description: extraction.description } : null;

        const passed = testCase.expected === null
            ? got === null
            : got !== null && got.description === testCase.expected.description;

        if (passed) {
            result.passed++;
            console.log(`  ✅ "${testCase.input}" ${testCase.hasImage ? '📷' : ''} → "${got?.description}" (${testCase.description})`);
        } else {
            result.failed++;
            console.log(`  ❌ "${testCase.input}" ${testCase.hasImage ? '📷' : ''} (${testCase.description})`);
            console.log(`     Expected: "${testCase.expected?.description}", Got: "${got?.description}"`);
        }

        result.details.push({
            category: 'meal',
            input: testCase.input,
            description: testCase.description,
            passed,
            expected: testCase.expected,
            got
        });
    }

    // Summary
    console.log('\n📈 ============ TEST SUMMARY ============');
    console.log(`✅ Passed: ${result.passed}/${result.total}`);
    console.log(`❌ Failed: ${result.failed}/${result.total}`);
    console.log(`📊 Success Rate: ${((result.passed / result.total) * 100).toFixed(1)}%`);

    if (result.failed > 0) {
        console.log('\n⚠️  Failed Tests:');
        result.details
            .filter(d => !d.passed)
            .forEach(d => {
                console.log(`  - [${d.category}] "${d.input}" (${d.description})`);
            });
    }

    return result;
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

function testValidation() {
    console.log('\n🔍 Testing Validation Functions...');

    const validationTests = [
        { fn: isValidGlucose, value: 20, expected: true, desc: 'Min glucose' },
        { fn: isValidGlucose, value: 600, expected: true, desc: 'Max glucose' },
        { fn: isValidGlucose, value: 19, expected: false, desc: 'Below min glucose' },
        { fn: isValidGlucose, value: 601, expected: false, desc: 'Above max glucose' },
        { fn: isValidInsulin, value: 0.5, expected: true, desc: 'Min insulin' },
        { fn: isValidInsulin, value: 100, expected: true, desc: 'Max insulin' },
        { fn: isValidInsulin, value: 0.4, expected: false, desc: 'Below min insulin' },
        { fn: isValidInsulin, value: 101, expected: false, desc: 'Above max insulin' },
    ];

    let passed = 0;
    for (const test of validationTests) {
        const result = test.fn(test.value);
        if (result === test.expected) {
            passed++;
            console.log(`  ✅ ${test.desc}: ${test.value} → ${result}`);
        } else {
            console.log(`  ❌ ${test.desc}: ${test.value} → ${result} (expected ${test.expected})`);
        }
    }

    console.log(`\n✅ Validation: ${passed}/${validationTests.length} passed`);
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

function testIntegration() {
    console.log('\n🔗 Testing Integration (analyzeMessage)...');

    const integrationTests = [
        {
            input: "minha glicemia é 201",
            hasImage: false,
            expected: { primaryType: 'glucose', confidence: 0.95 },
            desc: 'Glucose only'
        },
        {
            input: "apliquei 10u",
            hasImage: false,
            expected: { primaryType: 'insulin', confidence: 0.92 },
            desc: 'Insulin only'
        },
        {
            input: "comi pizza",
            hasImage: false,
            expected: { primaryType: 'meal', confidence: 0.88 },
            desc: 'Meal only'
        },
        {
            input: "foto do almoço",
            hasImage: true,
            expected: { primaryType: 'meal', confidence: 0.95 },
            desc: 'Meal with image'
        },
    ];

    let passed = 0;
    for (const test of integrationTests) {
        const result = analyzeMessage(test.input, test.hasImage);
        const matchesPrimary = result.primaryType === test.expected.primaryType;
        const matchesConfidence = Math.abs(result.confidence - test.expected.confidence) < 0.1;

        if (matchesPrimary && matchesConfidence) {
            passed++;
            console.log(`  ✅ ${test.desc}: ${result.primaryType} (${result.confidence.toFixed(2)})`);
        } else {
            console.log(`  ❌ ${test.desc}`);
            console.log(`     Expected: ${test.expected.primaryType} (${test.expected.confidence})`);
            console.log(`     Got: ${result.primaryType} (${result.confidence.toFixed(2)})`);
        }
    }

    console.log(`\n✅ Integration: ${passed}/${integrationTests.length} passed`);
}

// ============================================================================
// MAIN
// ============================================================================

export function runAllTests() {
    const mainResult = runTests();
    testValidation();
    testIntegration();

    return mainResult;
}

// Auto-run if executed directly
if (require.main === module) {
    runAllTests();
}
