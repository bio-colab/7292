
// --- Global p5 instances ---
let p5Argand, p5VectorAdd, p5RootsUnity;

// --- Dark Mode ---
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// Apply dark mode on initial load if needed
if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.textContent = 'الوضع الفاتح';
} else {
    darkModeToggle.textContent = 'الوضع الداكن';
}

darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    darkModeToggle.textContent = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
    // Redraw all p5 sketches
    if (p5Argand && typeof p5Argand.redraw === 'function') p5Argand.redraw();
    if (p5VectorAdd && typeof p5VectorAdd.redraw === 'function') p5VectorAdd.redraw();
    if (p5RootsUnity && typeof p5RootsUnity.redraw === 'function') p5RootsUnity.redraw();
});

// --- Helper Functions ---
/**
 * Parses a complex number string (a+bi, a-bi, bi, a, i, -i) into an object {real, imag}.
 */
function parseComplex(str) {
    if (typeof str !== 'string') return { real: 0, imag: 0 };
    str = str.replace(/\s+/g, '').toLowerCase();
    str = str.replace('pi', Math.PI.toString());
    str = str.replace(/sqrt\((\d+(\.\d+)?)\)/g, (match, num) => Math.sqrt(parseFloat(num)).toString());
     str = str.replace(/(\d+(\.\d+)?)\/(\d+(\.\d+)?)/g, (match, num, _, den) => (parseFloat(num) / parseFloat(den)).toString());


    let real = 0;
    let imag = 0;

    // Handle pure imaginary first (i, -i, bi, -bi)
    const imagMatch = str.match(/^([\+\-]?(\d+(\.\d+)?)?)i$/);
     const pureImagMatch = str.match(/^([\+\-]?)i$/);

    if (str === 'i') {
        imag = 1;
    } else if (str === '-i') {
        imag = -1;
    } else if (imagMatch) {
         if (imagMatch[1] === '+' || imagMatch[1] === '') imag = parseFloat(imagMatch[2] || '1');
         else if (imagMatch[1] === '-') imag = -parseFloat(imagMatch[2] || '1');
         else imag = parseFloat(imagMatch[1] || '1'); // Handles cases like "3i"
    } else {
        // Handle mixed or pure real
        // Remove trailing i part to find real part
         const realPartStr = str.replace(/([\+\-]?(\d+(\.\d+)?)?)i$/, '');
        if (realPartStr === '' && str.includes('i')) { // Pure imaginary was handled above or it's like "+i" "-i"
             real = 0;
        } else if (realPartStr === '+' || realPartStr === '-') { // Only sign left means real is 0
             real = 0;
        }
         else if (realPartStr !== '') {
            real = parseFloat(realPartStr);
             if (isNaN(real)) real = 0; // Handle parsing errors
        }


        // Find imaginary part in mixed number
        const imagPartMatch = str.match(/([\+\-](\d+(\.\d+)?)?)i$/);
         const signedImagMatch = str.match(/([\+\-])i$/);

         if (imagPartMatch) {
             if (imagPartMatch[1] === '+') imag = parseFloat(imagPartMatch[2] || '1');
             else if (imagPartMatch[1] === '-') imag = -parseFloat(imagPartMatch[2] || '1');
             else if (!str.startsWith('-') && !str.startsWith('+') && !realPartStr.includes('+') && !realPartStr.includes('-')){
                 // Case like 3+2i, imag part is positive implicitly
                 const simpleImagMatch = str.match(/(\d+(\.\d+)?)i$/);
                 if(simpleImagMatch) imag = parseFloat(simpleImagMatch[1] || '1');
             }
              else { // Sign is part of the number e.g. +2i, -5i
                imag = parseFloat(imagPartMatch[1] || '1');
             }
         } else if (signedImagMatch) {
             imag = (signedImagMatch[1] === '+') ? 1 : -1;
         }
          else if (!str.includes('i') && realPartStr === str){
            imag = 0; // It's purely real
        }

    }
     // Final check for NaN
    if (isNaN(real)) real = 0;
    if (isNaN(imag)) imag = 0;

    return { real, imag };
}


/**
 * Normalizes a user's answer string for comparison.
 * Handles i, fractions, sqrt, and basic omega terms (ω, ω^2).
 * Returns a standardized string representation.
 */
function normalizeAnswer(answer) {
    if (typeof answer !== 'string') return '';
    let norm = answer.toLowerCase().replace(/\s+/g, '');

    // Replace constants and functions
    norm = norm.replace(/pi/g, Math.PI.toFixed(3)); // Use fixed precision for comparison
    norm = norm.replace(/sqrt\((\d+(\.\d+)?)\)/g, (match, num) => Math.sqrt(parseFloat(num)).toFixed(3));
    norm = norm.replace(/(\d+(\.\d+)?)\/(\d+(\.\d+)?)/g, (match, num, _, den) => (parseFloat(num) / parseFloat(den)).toFixed(3));

    // Normalize i placement and coefficient
    norm = norm.replace(/i(\d+(\.\d+)?)/g, '$1i'); // i3 -> 3i
    norm = norm.replace(/^\+/, '').replace(/\+$/, ''); // Remove leading/trailing +
    norm = norm.replace(/([\+\-])i$/, '$11i'); // +i -> +1i, -i -> -1i
    norm = norm.replace(/^i$/, '1i'); // i -> 1i
    norm = norm.replace(/\+-/g, '-');

    // Handle omega (basic recognition, no simplification like ω^3=1)
    norm = norm.replace(/omega/g, 'w');
    norm = norm.replace(/w\^2/g, 'w2'); // Standardize omega squared

    // Attempt to standardize a+bi or a+bω+cω^2 order (very basic)
    // This part is tricky and error-prone for complex expressions.
    // We rely more on approximate comparison for complex numbers.
    // For omega, exact string match after normalization is often needed.

    // Example: Split into parts and reorder (simple cases only)
    const parts = norm.match(/([\+\-]?(?:(?:\d*\.\d+|\d+)(?![iw])|(?:\d*\.\d+|\d+)i|i|(?:\d*\.\d+|\d+)w2|w2|(?:\d*\.\d+|\d+)w|w))/g);
    if (parts && parts.length > 1) {
        let realPart = parts.find(p => !p.includes('i') && !p.includes('w')) || '0';
        let imagPart = parts.find(p => p.includes('i')) || '0i';
        let wPart = parts.find(p => p.endsWith('w') && !p.endsWith('w2')) || '0w';
        let w2Part = parts.find(p => p.endsWith('w2')) || '0w2';

         // Fix coefficients like 'i' -> '1i', 'w' -> '1w' etc. for sorting/comparison
        if (imagPart === 'i') imagPart = '1i'; if (imagPart === '-i') imagPart = '-1i';
        if (wPart === 'w') wPart = '1w'; if (wPart === '-w') wPart = '-1w';
        if (w2Part === 'w2') w2Part = '1w2'; if (w2Part === '-w2') w2Part = '-1w2';


        // Filter out zero parts unless it's the only part
        const nonZeroParts = [realPart, imagPart, wPart, w2Part].filter(p => !p.startsWith('0') || p === '0');

        if (nonZeroParts.length > 0) {
             // Basic sort: real, imag, w, w2 (won't handle all cases perfectly)
             // Reconstruct, adding '+' for positive non-leading terms
             norm = '';
             if (realPart !== '0') norm += realPart;
             if (imagPart !== '0i') norm += (norm !== '' && !imagPart.startsWith('-') ? '+' : '') + imagPart;
             if (wPart !== '0w') norm += (norm !== '' && !wPart.startsWith('-') ? '+' : '') + wPart;
             if (w2Part !== '0w2') norm += (norm !== '' && !w2Part.startsWith('-') ? '+' : '') + w2Part;

            if (norm === '') norm = '0'; // Handle case where all parts were zero
            norm = norm.replace('+-','-'); // Cleanup again
        } else {
            norm = '0';
        }
    }
     // Handle simple cases like just "w" or "w2"
    if (norm === 'w') norm = '1w';
    if (norm === 'w2') norm = '1w2';

    return norm.trim();
}


/**
 * Checks a single input answer against a correct answer.
 * Uses approximate comparison for complex numbers if allowVariation is true.
 */
function checkAnswer(exerciseId, correctAnswer, allowVariation = false, tolerance = 0.01) {
    const input = document.getElementById(exerciseId + '-input');
    const feedback = document.getElementById(exerciseId + '-feedback');
    const userAnswer = input.value;
    const userAnswerNorm = normalizeAnswer(userAnswer);
    const correctAnswerNorm = normalizeAnswer(correctAnswer);

    feedback.className = 'feedback'; // Reset classes
    feedback.style.display = 'block'; // Make visible before transition

    let isCorrect = false;

    if (userAnswerNorm === correctAnswerNorm) {
        isCorrect = true;
    } else if (allowVariation) {
        // Try parsing as complex numbers for tolerance check
        const userParsed = parseComplex(userAnswer);
        const correctParsed = parseComplex(correctAnswer); // Use original for parsing accuracy

        if (Math.abs(userParsed.real - correctParsed.real) < tolerance &&
            Math.abs(userParsed.imag - correctParsed.imag) < tolerance) {
            isCorrect = true;
            // Optionally update input value to normalized form if correct within tolerance
            // input.value = `${correctParsed.real.toFixed(2)} + ${correctParsed.imag.toFixed(2)}i`.replace('+ -','- ');
        }
         // Special check for common variations like sqrt(2) vs 1.414
         else if (correctAnswer.includes('sqrt')) {
             // Try normalizing the correct answer differently
             let altCorrect = correctAnswer.replace(/sqrt\((\d+(\.\d+)?)\)/g, (m, n) => `(${Math.sqrt(parseFloat(n)).toFixed(3)})`);
             if (normalizeAnswer(altCorrect) === userAnswerNorm) {
                 isCorrect = true;
             }
         }
         // Add specific checks for omega if needed, e.g., w vs -1-w^2
         // Example: if (correctAnswerNorm === '1w' && userAnswerNorm === '-1-1w2') isCorrect = true;
    }

    if (isCorrect) {
        feedback.textContent = 'إجابة صحيحة!';
        feedback.className = 'feedback correct';
    } else {
        // Try to provide a more helpful correct format
        let displayCorrect = correctAnswer;
        try {
           const correctParsed = parseComplex(correctAnswer);
            if (Math.abs(correctParsed.imag) > 1e-6) { // Display as a+bi if imaginary part exists
                displayCorrect = `${correctParsed.real.toFixed(2)}${correctParsed.imag >= 0 ? '+' : ''}${correctParsed.imag.toFixed(2)}i`;
                displayCorrect = displayCorrect.replace('+0.00i', '').replace('-0.00i', '').replace('1.00i','i').replace('-1.00i','-i');
                if (Math.abs(correctParsed.real) < 1e-6 && Math.abs(correctParsed.imag) > 1e-6) displayCorrect = `${correctParsed.imag.toFixed(2)}i`.replace('1.00i','i').replace('-1.00i','-i'); // only imag
            } else { // Display as real if imag is zero
                 displayCorrect = `${correctParsed.real.toFixed(2)}`;
            }
            if (correctAnswer.includes('w') || correctAnswer.includes('omega')) displayCorrect = correctAnswer; // Keep omega answers as is

        } catch (e) { /* Use original correct answer if parsing fails */ }

        feedback.textContent = `إجابة خاطئة. الإجابة المتوقعة تشبه ${displayCorrect}. حاول مرة أخرى أو شاهد الحل.`;
        feedback.className = 'feedback incorrect';
    }

    // Trigger transition
    setTimeout(() => feedback.classList.add('show'), 10);
}

/**
 * Checks multiple inputs against an array of correct answers.
 */
function checkMultiAnswer(exerciseId, correctAnswers, orderDoesntMatter = false, tolerance = 0.01) {
    const inputs = document.querySelectorAll(`input[id^='${exerciseId}-'][type='text']`);
    const feedback = document.getElementById(exerciseId + '-feedback');
    let userAnswers = Array.from(inputs).map(input => input.value);
    let userAnswersNorm = userAnswers.map(normalizeAnswer);
    let correctAnswersNorm = correctAnswers.map(normalizeAnswer);

    feedback.className = 'feedback'; // Reset classes
    feedback.style.display = 'block';

    let correctCount = 0;
    let allCorrect = false;

    if (orderDoesntMatter) {
        // Check if each user answer matches *some* correct answer (within tolerance for complex)
        // and if all correct answers have been matched.
        let matchedCorrectIndices = new Set();
        for (let i = 0; i < userAnswers.length; i++) {
            let foundMatch = false;
            for (let j = 0; j < correctAnswers.length; j++) {
                if (!matchedCorrectIndices.has(j)) {
                    if (userAnswersNorm[i] === correctAnswersNorm[j]) {
                        correctCount++;
                        matchedCorrectIndices.add(j);
                        foundMatch = true;
                        break;
                    } else {
                        // Tolerance check
                        const userParsed = parseComplex(userAnswers[i]);
                        const correctParsed = parseComplex(correctAnswers[j]);
                         if (Math.abs(userParsed.real - correctParsed.real) < tolerance &&
                            Math.abs(userParsed.imag - correctParsed.imag) < tolerance) {
                             correctCount++;
                             matchedCorrectIndices.add(j);
                             foundMatch = true;
                             break;
                         }
                         // Add specific omega checks if needed
                    }
                }
            }
        }
        allCorrect = (correctCount === correctAnswers.length && userAnswers.length === correctAnswers.length);

    } else {
        // Check answers in the specified order
        if (userAnswers.length === correctAnswers.length) {
            allCorrect = true; // Assume correct initially
            for (let i = 0; i < userAnswers.length; i++) {
                if (userAnswersNorm[i] === correctAnswersNorm[i]) {
                    continue; // Exact match
                } else {
                     // Tolerance check
                    const userParsed = parseComplex(userAnswers[i]);
                    const correctParsed = parseComplex(correctAnswers[i]);
                    if (Math.abs(userParsed.real - correctParsed.real) < tolerance &&
                        Math.abs(userParsed.imag - correctParsed.imag) < tolerance) {
                        continue; // Match within tolerance
                    }
                    // Add specific omega checks if needed
                     allCorrect = false; // Mismatch found
                     break;
                }
            }
        }
    }


    if (allCorrect) {
        feedback.textContent = 'إجابات صحيحة!';
        feedback.className = 'feedback correct';
    } else {
        feedback.textContent = `إجابات خاطئة أو غير كاملة. تأكد من إدخال جميع الإجابات المطلوبة بالشكل الصحيح (${correctAnswers.join(' و ')}). حاول مرة أخرى أو شاهد الحل.`;
        feedback.className = 'feedback incorrect';
    }

    setTimeout(() => feedback.classList.add('show'), 10);
}


/**
 * Toggles the visibility of the solution div.
 */
function toggleSolution(solutionId) {
    const solutionDiv = document.getElementById(solutionId);
    if (!solutionDiv) return;
    const isHidden = solutionDiv.style.display === 'none' || solutionDiv.style.display === '';
    solutionDiv.style.display = isHidden ? 'block' : 'none';
    if (isHidden && typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        // Ensure MathJax typesets the content when shown
        MathJax.typesetPromise([solutionDiv]).catch((err) => console.error('MathJax typesetting error:', err));
    }
}

// --- p5.js Sketches ---

// Sketch 1: Basic Argand Diagram with Conjugate
const sketchArgand = (p) => {
    let canvasWidth = Math.min(p.windowWidth * 0.8, 400);
    let canvasHeight = canvasWidth * 0.75;
    let originX, originY;
    let scaleFactor = canvasWidth / 10; // e.g., 1 unit = 40 pixels if width is 400
    let z_real = 3;
    let z_imag = 2;

    p.setup = () => {
        let container = document.getElementById('argandDiagramContainer');
        canvasWidth = container.offsetWidth; // Use container width
        canvasHeight = canvasWidth * 0.75;
        scaleFactor = canvasWidth / 10;
        let canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(container);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        p.noLoop(); // Only redraw when needed
    };

     p.windowResized = () => {
        let container = document.getElementById('argandDiagramContainer');
        canvasWidth = container.offsetWidth;
        canvasHeight = canvasWidth * 0.75;
        scaleFactor = canvasWidth / 10;
        p.resizeCanvas(canvasWidth, canvasHeight);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        p.redraw();
    };


    p.draw = () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const bgColor = isDarkMode ? p.color(31, 42, 68) : p.color(249, 250, 251); // Match --secondary-color
        const axisColor = isDarkMode ? p.color(156, 163, 175) : p.color(107, 114, 128);
        const textColor = isDarkMode ? p.color(209, 213, 219) : p.color(31, 41, 55);
        const pointColorZ = isDarkMode ? p.color(59, 130, 246) : p.color(30, 64, 175); // Blue
        const pointColorConj = isDarkMode ? p.color(16, 185, 129) : p.color(5, 150, 105); // Green
        const vectorColorZ = isDarkMode ? p.color(245, 158, 11) : p.color(220, 38, 38); // Orange/Red
        const vectorColorConj = isDarkMode ? p.color(34, 197, 94) : p.color(22, 163, 74); // Lighter Green

        p.background(bgColor);

        // Draw Axes
        p.stroke(axisColor);
        p.strokeWeight(1);
        p.line(0, originY, canvasWidth, originY); // Real axis
        p.line(originX, 0, originX, canvasHeight); // Imaginary axis
        // Arrows
        p.fill(axisColor);
        p.triangle(canvasWidth - 10, originY - 5, canvasWidth, originY, canvasWidth - 10, originY + 5); // Real arrow
        p.triangle(originX - 5, 10, originX, 0, originX + 5, 10); // Imag arrow
        // Labels
        p.noStroke();
        p.fill(textColor);
        p.textAlign(p.LEFT, p.TOP);
        p.text("Re", canvasWidth - 25, originY + 5);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text("Im", originX + 15, 20);

        // Draw z = 3 + 2i
        let pointX_z = originX + z_real * scaleFactor;
        let pointY_z = originY - z_imag * scaleFactor; // Subtract because p5 y-axis is inverted

        // Vector for z
        p.stroke(vectorColorZ);
        p.strokeWeight(2);
        p.line(originX, originY, pointX_z, pointY_z);
        // Point for z
        p.stroke(pointColorZ);
        p.strokeWeight(8);
        p.point(pointX_z, pointY_z);
        // Label for z
        p.noStroke();
        p.fill(textColor);
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(`z = ${z_real} + ${z_imag}i`, pointX_z + 5, pointY_z - 5);

         // Draw conjugate z_conj = 3 - 2i
        let pointX_conj = originX + z_real * scaleFactor;
        let pointY_conj = originY - (-z_imag) * scaleFactor; // Conjugate flips imaginary part sign

        // Vector for conjugate
        p.stroke(vectorColorConj);
        p.strokeWeight(2);
        p.line(originX, originY, pointX_conj, pointY_conj);
        // Point for conjugate
        p.stroke(pointColorConj);
        p.strokeWeight(6); // Slightly smaller point
        p.point(pointX_conj, pointY_conj);
        // Label for conjugate
        p.noStroke();
        p.fill(textColor);
        p.textAlign(p.LEFT, p.TOP);
         p.text(`z̄ = ${z_real} - ${z_imag}i`, pointX_conj + 5, pointY_conj + 5);

        // Draw origin O
        p.fill(textColor);
        p.noStroke();
        p.text("O", originX - 15, originY + 15);
        p.stroke(textColor);
        p.strokeWeight(4);
        p.point(originX, originY);
    };
};

// Sketch 2: Vector Addition
const sketchVectorAdd = (p) => {
    let canvasWidth, canvasHeight;
    let originX, originY;
    let scaleFactor;
    let z1 = { real: 3, imag: 1 };
    let z2 = { real: 1, imag: 2 };
    let z_sum = { real: 4, imag: 3 };

    function calculateSum() {
        z_sum.real = z1.real + z2.real;
        z_sum.imag = z1.imag + z2.imag;
    }

    p.setup = () => {
        let container = document.getElementById('vectorAdditionContainer');
        canvasWidth = container.offsetWidth;
        canvasHeight = canvasWidth; // Make it square for better visualization
        scaleFactor = canvasWidth / 12; // Adjust scale to fit potentially larger sums
        let canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(container);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        calculateSum();
        p.noLoop(); // Redraw only on update
    };

     p.windowResized = () => {
        let container = document.getElementById('vectorAdditionContainer');
         canvasWidth = container.offsetWidth;
        canvasHeight = canvasWidth;
        scaleFactor = canvasWidth / 12;
        p.resizeCanvas(canvasWidth, canvasHeight);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        p.redraw();
    };


    p.updateVectors = (newZ1, newZ2) => {
        z1 = newZ1;
        z2 = newZ2;
        calculateSum();
        p.redraw();
    };

    p.draw = () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const bgColor = isDarkMode ? p.color(31, 42, 68) : p.color(249, 250, 251);
        const axisColor = isDarkMode ? p.color(156, 163, 175) : p.color(107, 114, 128);
        const textColor = isDarkMode ? p.color(209, 213, 219) : p.color(31, 41, 55);
        const colorZ1 = isDarkMode ? p.color(59, 130, 246) : p.color(30, 64, 175); // Blue
        const colorZ2 = isDarkMode ? p.color(16, 185, 129) : p.color(5, 150, 105); // Green
        const colorSum = isDarkMode ? p.color(239, 68, 68) : p.color(220, 38, 38); // Red
        const guideColor = isDarkMode ? p.color(75, 85, 99) : p.color(209, 213, 219); // Gray


        p.background(bgColor);

        // Draw Axes
        p.stroke(axisColor);
        p.strokeWeight(1);
        p.line(0, originY, canvasWidth, originY);
        p.line(originX, 0, originX, canvasHeight);
        p.fill(axisColor);
        p.triangle(canvasWidth - 10, originY - 5, canvasWidth, originY, canvasWidth - 10, originY + 5);
        p.triangle(originX - 5, 10, originX, 0, originX + 5, 10);
        p.noStroke();
        p.fill(textColor);
        p.text("Re", canvasWidth - 25, originY + 5);
        p.text("Im", originX + 15, 20);

        // Coordinates
        let x1 = originX + z1.real * scaleFactor;
        let y1 = originY - z1.imag * scaleFactor;
        let x2 = originX + z2.real * scaleFactor;
        let y2 = originY - z2.imag * scaleFactor;
        let x_sum = originX + z_sum.real * scaleFactor;
        let y_sum = originY - z_sum.imag * scaleFactor;

        // Draw Vectors
        // z1
        p.stroke(colorZ1);
        p.strokeWeight(2);
        p.line(originX, originY, x1, y1);
        p.fill(colorZ1);
        p.ellipse(x1, y1, 8, 8);
        p.noStroke();
        p.text(`z₁ (${z1.real}, ${z1.imag}i)`, x1 + 5, y1 - 5);

        // z2
        p.stroke(colorZ2);
        p.strokeWeight(2);
        p.line(originX, originY, x2, y2);
        p.fill(colorZ2);
        p.ellipse(x2, y2, 8, 8);
         p.noStroke();
        p.text(`z₂ (${z2.real}, ${z2.imag}i)`, x2 + 5, y2 + 5);

        // z1 + z2 (Sum)
        p.stroke(colorSum);
        p.strokeWeight(3); // Thicker line for the sum
        p.line(originX, originY, x_sum, y_sum);
        p.fill(colorSum);
        p.ellipse(x_sum, y_sum, 10, 10); // Larger point for the sum
         p.noStroke();
        p.text(`z₁+z₂ (${z_sum.real}, ${z_sum.imag}i)`, x_sum + 5, y_sum - 5);


        // Parallelogram rule guides
        p.stroke(guideColor);
        p.strokeWeight(1);
        p.drawingContext.setLineDash([5, 5]); // Dashed lines
        p.line(x1, y1, x_sum, y_sum); // From z1 tip to sum tip (parallel to z2)
        p.line(x2, y2, x_sum, y_sum); // From z2 tip to sum tip (parallel to z1)
        p.drawingContext.setLineDash([]); // Reset line dash

         // Draw origin O
        p.fill(textColor);
        p.noStroke();
        p.text("O", originX - 15, originY + 15);
        p.stroke(textColor);
        p.strokeWeight(4);
        p.point(originX, originY);
    };
};

// Sketch 3: Roots of Unity
const sketchRootsOfUnity = (p) => {
    let canvasWidth, canvasHeight;
    let originX, originY;
    let radius;
    let n = 3; // Default to cube roots

    p.setup = () => {
        let container = document.getElementById('rootsOfUnityContainer');
        canvasWidth = container.offsetWidth;
        canvasHeight = canvasWidth; // Square canvas
        radius = canvasWidth * 0.35; // Radius for the unit circle visualization
        let canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(container);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        p.angleMode(p.RADIANS);
        p.noLoop();
    };

    p.windowResized = () => {
        let container = document.getElementById('rootsOfUnityContainer');
        canvasWidth = container.offsetWidth;
        canvasHeight = canvasWidth;
        radius = canvasWidth * 0.35;
        p.resizeCanvas(canvasWidth, canvasHeight);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        p.redraw();
    };


    p.updateN = (newN) => {
        n = parseInt(newN);
        if (isNaN(n) || n < 2) n = 2; // Minimum 2 roots
        p.redraw();
    };

    p.draw = () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const bgColor = isDarkMode ? p.color(31, 42, 68) : p.color(249, 250, 251);
        const axisColor = isDarkMode ? p.color(156, 163, 175) : p.color(107, 114, 128);
        const textColor = isDarkMode ? p.color(209, 213, 219) : p.color(31, 41, 55);
        const circleColor = isDarkMode ? p.color(75, 85, 99) : p.color(209, 213, 219); // Gray
        const pointColor = isDarkMode ? p.color(217, 70, 239) : p.color(192, 38, 211); // Fuchsia/Purple
         const vectorColor = isDarkMode ? p.color(244, 114, 182) : p.color(219, 39, 119); // Pink

        p.background(bgColor);

        // Draw Axes
        p.stroke(axisColor);
        p.strokeWeight(1);
        p.line(0, originY, canvasWidth, originY);
        p.line(originX, 0, originX, canvasHeight);
        p.noStroke();
        p.fill(textColor);
        p.text("Re", canvasWidth - 25, originY + 5);
        p.text("Im", originX + 15, 20);

        // Draw Unit Circle (visual guide)
        p.noFill();
        p.stroke(circleColor);
        p.strokeWeight(1);
        p.ellipse(originX, originY, radius * 2, radius * 2);

        // Draw Roots
        p.strokeWeight(2);
        p.stroke(vectorColor);
         p.fill(pointColor);

        for (let k = 0; k < n; k++) {
            let angle = (2 * p.PI * k) / n;
            let x = originX + radius * p.cos(angle);
            let y = originY - radius * p.sin(angle); // Subtract sin because y-axis is inverted

            // Draw vector from origin to root
            p.line(originX, originY, x, y);

            // Draw point for the root
            p.ellipse(x, y, 8, 8);

            // Optional: Label the root (can get crowded)
             // p.noStroke();
             // p.fill(textColor);
             // p.text(`k=${k}`, x + 5, y - 5);
        }
         // Draw origin O
        p.fill(textColor);
        p.noStroke();
        p.text("O", originX - 15, originY + 15);
        p.stroke(textColor);
        p.strokeWeight(4);
        p.point(originX, originY);
    };
};

// --- Initialization and Event Listeners ---

// Function to update vector addition sketch
function updateVectorAddition() {
    const z1Val = document.getElementById('z1-input').value;
    const z2Val = document.getElementById('z2-input').value;
    const z1Parsed = parseComplex(z1Val);
    const z2Parsed = parseComplex(z2Val);

    if (p5VectorAdd && typeof p5VectorAdd.updateVectors === 'function') {
        p5VectorAdd.updateVectors(z1Parsed, z2Parsed);
    }
}

// Function to update roots of unity sketch
function updateRootsOfUnity() {
     const nVal = document.getElementById('n-roots').value;
     if (p5RootsUnity && typeof p5RootsUnity.updateN === 'function') {
         p5RootsUnity.updateN(nVal);
     }
}

// Initialize p5 sketches when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('argandDiagramContainer')) {
        p5Argand = new p5(sketchArgand);
    }
    if (document.getElementById('vectorAdditionContainer')) {
        p5VectorAdd = new p5(sketchVectorAdd);
        // Initial update based on default input values
        updateVectorAddition();
    }
     if (document.getElementById('rootsOfUnityContainer')) {
        p5RootsUnity = new p5(sketchRootsOfUnity);
        // Initial update based on default select value
         updateRootsOfUnity();
    }

    // Ensure MathJax typesets the whole page initially
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise().catch((err) => console.error('Initial MathJax typesetting error:', err));
    }
});

// Add resize listener to redraw sketches
window.addEventListener('resize', () => {
     if (p5Argand && typeof p5Argand.windowResized === 'function') p5Argand.windowResized();
     if (p5VectorAdd && typeof p5VectorAdd.windowResized === 'function') p5VectorAdd.windowResized();
     if (p5RootsUnity && typeof p5RootsUnity.windowResized === 'function') p5RootsUnity.windowResized();
});
