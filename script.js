// script.js

// --- Dark Mode ---
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.textContent = 'الوضع الفاتح';
}

darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    darkModeToggle.textContent = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
    if (typeof p5Sketch !== 'undefined' && typeof p5Sketch.redraw === 'function') {
        p5Sketch.redraw();
    }
});

// --- Interactive Exercises ---
function normalizeAnswer(answer) {
    if (typeof answer !== 'string') return '';
    let norm = answer.toLowerCase().replace(/\s+/g, '');
    norm = norm.replace(/pi/g, Math.PI.toString());
    norm = norm.replace(/sqrt\((\d+)\)/g, (match, num) => Math.sqrt(parseInt(num)).toFixed(3));
    norm = norm.replace(/(\d+)\/(\d+)/g, (match, num, den) => (parseInt(num) / parseInt(den)).toFixed(3));
    norm = norm.replace(/i([\d\.\-]+)/g, '$1i');
    norm = norm.replace(/^\+/, '').replace(/\+$/, '');
    norm = norm.replace(/^-i$/, '-1i');
    norm = norm.replace(/\+-/g, '-');

    let parts = norm.match(/([\+\-]?(?:(?:\d*\.\d+|\d+)(?!i)|(?:\d*\.\d+|\d+)i|i))/g);
    if (parts && parts.length > 1) {
        let realPart = parts.find(p => !p.includes('i')) || '0';
        let imagPart = parts.find(p => p.includes('i')) || '0i';
        if (imagPart === 'i') imagPart = '1i';
        if (imagPart === '-i') imagPart = '-1i';
        if (imagPart.startsWith('i') || (imagPart.includes('i') && !imagPart.startsWith('-') && parseFloat(imagPart) > 0)) {
            norm = realPart + '+' + imagPart;
        } else {
            norm = realPart + imagPart;
        }
        norm = norm.replace('+-', '-');
    }
    return norm;
}

function checkAnswer(exerciseId, correctAnswer, allowVariation = false) {
    const input = document.getElementById(exerciseId + '-input');
    const feedback = document.getElementById(exerciseId + '-feedback');
    const userAnswerNorm = normalizeAnswer(input.value);
    const correctAnswerNorm = normalizeAnswer(correctAnswer);
    const altCorrectAnswerNorm = correctAnswer.includes('sqrt') ? normalizeAnswer(correctAnswer.replace(/sqrt\((\d+)\)/g, 'sqrt$1')) : '';

    feedback.style.display = 'block';
    let isCorrect = false;
    if (allowVariation) {
        isCorrect = userAnswerNorm === correctAnswerNorm || (altCorrectAnswerNorm && userAnswerNorm === altCorrectAnswerNorm);
        if (!isCorrect && userAnswerNorm.includes('i') && correctAnswerNorm.includes('i')) {
            try {
                let userReal = parseFloat(userAnswerNorm.split(/[\+\-](?=[\d\.]*i)/)[0] || '0');
                let userImag = parseFloat((userAnswerNorm.match(/([\+\-]?[\d\.\d]+)i/)?.[1]) || (userAnswerNorm.includes('+i') ? '1' : (userAnswerNorm.includes('-i') ? '-1' : '0')));
                let correctReal = parseFloat(correctAnswerNorm.split(/[\+\-](?=[\d\.]*i)/)[0] || '0');
                let correctImag = parseFloat((correctAnswerNorm.match(/([\+\-]?[\d\.\d]+)i/)?.[1]) || (correctAnswerNorm.includes('+i') ? '1' : (correctAnswerNorm.includes('-i') ? '-1' : '0')));
                if (Math.abs(userReal - correctReal) < 0.01 && Math.abs(userImag - correctImag) < 0.01) {
                    isCorrect = true;
                }
            } catch (e) {
                console.error("Error parsing complex for tolerance check", e);
            }
        }
    } else {
        isCorrect = userAnswerNorm === correctAnswerNorm;
    }

    if (isCorrect) {
        feedback.textContent = 'إجابة صحيحة!';
        feedback.className = 'feedback correct';
    } else {
        feedback.textContent = `إجابة خاطئة. توقعنا شيئاً مثل ${correctAnswer}. حاول مرة أخرى أو شاهد الحل.`;
        feedback.className = 'feedback incorrect';
    }
    setTimeout(() => feedback.classList.add('show'), 10);
}

function checkMultiAnswer(exerciseId, correctAnswers, orderDoesntMatter = false) {
    const inputs = document.querySelectorAll(`input[id^='${exerciseId}-']`);
    const feedback = document.getElementById(exerciseId + '-feedback');
    let userAnswersNorm = Array.from(inputs).map(input => normalizeAnswer(input.value));
    let correctAnswersNorm = correctAnswers.map(ans => normalizeAnswer(ans));

    let isCorrect = false;
    if (orderDoesntMatter) {
        isCorrect = userAnswersNorm.length === correctAnswersNorm.length &&
                    userAnswersNorm.every(ans => correctAnswersNorm.includes(ans)) &&
                    correctAnswersNorm.every(ans => userAnswersNorm.includes(ans));
    } else {
        isCorrect = userAnswersNorm.length === correctAnswersNorm.length &&
                    userAnswersNorm.every((ans, index) => ans === correctAnswersNorm[index]);
    }

    feedback.style.display = 'block';
    if (isCorrect) {
        feedback.textContent = 'إجابات صحيحة!';
        feedback.className = 'feedback correct';
    } else {
        feedback.textContent = `إجابات خاطئة أو غير كاملة. توقعنا ${correctAnswers.join(' و ')}. حاول مرة أخرى أو شاهد الحل.`;
        feedback.className = 'feedback incorrect';
    }
    setTimeout(() => feedback.classList.add('show'), 10);
}

function toggleSolution(solutionId) {
    const solutionDiv = document.getElementById(solutionId);
    const isHidden = solutionDiv.style.display === 'none' || solutionDiv.style.display === '';
    solutionDiv.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        MathJax.typesetPromise([solutionDiv]).catch((err) => console.error('MathJax typesetting error:', err));
    }
}

// --- p5.js Sketch for Argand Diagram ---
let p5Sketch;
const sketch = (p) => {
    let canvasWidth = Math.min(window.innerWidth * 0.9, 400);
    let canvasHeight = canvasWidth * 0.75;
    let originX, originY;
    let scaleFactor = canvasWidth / 10;
    let z_real = 3;
    let z_imag = 2;

    p.setup = () => {
        let container = document.getElementById('argandDiagramContainer');
        let canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(container);
        originX = canvasWidth / 2;
        originY = canvasHeight / 2;
        p.noLoop();
        darkModeToggle.addEventListener('click', () => p.redraw());
        window.addEventListener('resize', () => {
            canvasWidth = Math.min(window.innerWidth * 0.9, 400);
            canvasHeight = canvasWidth * 0.75;
            scaleFactor = canvasWidth / 10;
            p.resizeCanvas(canvasWidth, canvasHeight);
            originX = canvasWidth / 2;
            originY = canvasHeight / 2;
            p.redraw();
        });
    };

    p.draw = () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const bgColor = isDarkMode ? '#1f2a44' : '#f9fafb';
        const axisColor = isDarkMode ? '#9ca3af' : '#6b7280';
        const textColor = isDarkMode ? '#d1d5db' : '#1f2937';
        const pointColor = isDarkMode ? '#3b82f6' : '#1e40af';
        const vectorColor = isDarkMode ? '#f59e0b' : '#dc2626';

        p.background(bgColor);
        p.strokeWeight(1);
        p.stroke(axisColor);
        p.line(0, originY, canvasWidth, originY);
        p.line(originX, 0, originX, canvasHeight);

        p.fill(textColor);
        p.noStroke();
        p.textAlign(p.RIGHT, p.CENTER);
        p.text("Re", canvasWidth - 10, originY - 10);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text("Im", originX + 15, 12);

        let pointX = originX + z_real * scaleFactor;
        let pointY = originY - z_imag * scaleFactor;

        p.strokeWeight(2);
        p.stroke(vectorColor);
        p.line(originX, originY, pointX, pointY);

        p.strokeWeight(8);
        p.stroke(pointColor);
        p.point(pointX, pointY);

        p.fill(textColor);
        p.noStroke();
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(`(${z_real}, ${z_imag}i)`, pointX + 5, pointY - 5);
    };
};

window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('argandDiagramContainer')) {
        p5Sketch = new p5(sketch);
    }
});