function renderMathJSON(jsonString, containerElement) {
  containerElement.innerHTML = ''; // Clear existing
  let data;
  try {
    data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch(e) {
    // Fallback to markdown if it's not valid JSON
    const md = window.markdownit();
    containerElement.style.whiteSpace = 'normal';
    containerElement.innerHTML = md.render(typeof jsonString === 'string' ? jsonString : JSON.stringify(jsonString));
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([containerElement]).catch(err => console.error(err));
    }
    return;
  }

  if (data.quiz_problem) {
    renderQuizJSON(data, containerElement);
    return;
  }

  containerElement.style.whiteSpace = 'normal';
  containerElement.classList.add('math-engine-container');

  // Problem Header
  if (data.problem) {
    const probEl = document.createElement('div');
    probEl.className = 'math-problem-header';
    probEl.innerHTML = `<h3>Problem</h3><div class="math-eq">\\[ ${data.problem.replace(/\$\$/g, '').replace(/\$/g, '')} \\]</div>`;
    containerElement.appendChild(probEl);
  }

  // Steps
  if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'math-steps-container';
    stepsContainer.innerHTML = '<h3>Step-by-Step Solution</h3>';
    
    data.steps.forEach((step, index) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'math-step-card';
      
      let stepEq = step.equation || '';
      // Clean up extra $$ if the AI added them around the whole thing
      stepEq = stepEq.replace(/^\$\$/, '\\[').replace(/\$\$$/, '\\]');
      if (!stepEq.includes('\\[') && !stepEq.includes('$$')) {
          stepEq = `\\[ ${stepEq} \\]`;
      }
      
      stepEl.innerHTML = `
        <div class="step-number">${index + 1}</div>
        <div class="step-content">
          <div class="step-desc">${step.description}</div>
          <div class="step-eq">${stepEq}</div>
        </div>
      `;
      stepsContainer.appendChild(stepEl);
    });
    
    containerElement.appendChild(stepsContainer);
  }

  // Final Answer
  if (data.finalAnswer) {
    const ansEl = document.createElement('div');
    ansEl.className = 'math-final-answer';
    
    let ansEq = data.finalAnswer;
    if (!ansEq.includes('\\[') && !ansEq.includes('$$')) {
        ansEq = `\\[ ${ansEq} \\]`;
    }
    
    ansEl.innerHTML = `<h3>Final Answer</h3><div class="math-eq highlight-answer">${ansEq}</div>`;
    containerElement.appendChild(ansEl);
  }
  
  // Graph Data (Placeholder for now, but UI is ready)
  if (data.graph_data && data.graph_data.expression) {
    const graphEl = document.createElement('div');
    graphEl.className = 'math-graph-container';
    graphEl.innerHTML = `<h3>Graph</h3>
      <div class="graph-placeholder">
        <i class="fas fa-chart-line"></i> Graph of \\( y = ${data.graph_data.expression.replace(/\$/g, '')} \\)
        <p>${data.graph_data.description || ''}</p>
      </div>`;
    containerElement.appendChild(graphEl);
  }

  // Quiz Me Button
  if (data.problem) {
    const quizContainer = document.createElement('div');
    quizContainer.className = 'math-quiz-container';
    quizContainer.style.marginTop = '20px';
    quizContainer.style.textAlign = 'center';
    
    const quizBtn = document.createElement('button');
    quizBtn.className = 'primary-btn';
    quizBtn.innerHTML = '<i class="fas fa-question-circle"></i> Quiz Me on this concept';
    quizBtn.onclick = async () => {
      quizBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Quiz...';
      quizBtn.disabled = true;
      try {
        const payload = {
          user: 'math-quiz-generate',
          message: `Generate a practice problem similar to: ${data.problem}`,
          attachments: [],
          messages: [{ role: 'user', content: `Generate a practice problem similar to: ${data.problem}` }]
        };
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const resData = await response.json();
        renderMathJSON(resData.reply, containerElement);
      } catch (err) {
        console.error(err);
        quizBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed. Try again';
        quizBtn.disabled = false;
      }
    };
    
    quizContainer.appendChild(quizBtn);
    containerElement.appendChild(quizContainer);
  }

  // Typeset math
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([containerElement]).catch(err => console.error(err));
  }
}

function renderQuizJSON(data, containerElement) {
  containerElement.innerHTML = '';
  containerElement.style.whiteSpace = 'normal';
  containerElement.classList.add('math-engine-container');

  const quizCard = document.createElement('div');
  quizCard.className = 'math-problem-header';
  quizCard.style.borderColor = 'rgba(123, 97, 255, 0.4)'; // specific quiz styling
  
  let problemEq = data.quiz_problem;
  if (!problemEq.includes('\\[') && !problemEq.includes('$$') && !problemEq.includes('\\(')) {
      problemEq = `\\[ ${problemEq} \\]`;
  }
  
  quizCard.innerHTML = `
    <h3 style="color: var(--accent-2, #7b61ff);"><i class="fas fa-graduation-cap"></i> Practice Quiz</h3>
    <div class="math-eq">${problemEq}</div>
    <div style="margin-top: 16px; display: flex; gap: 10px;">
      <input type="text" id="quizAnswerInput" placeholder="Type your answer here..." style="flex-grow: 1; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white;">
      <button id="checkQuizBtn" class="primary-btn" style="width: auto; margin-top: 0;">Check Answer</button>
    </div>
    <div id="quizFeedbackArea" style="margin-top: 16px;"></div>
    <button id="showSolutionBtn" class="ghost-btn" style="width: 100%; margin-top: 12px; font-size: 0.9rem;">Show Full Solution</button>
  `;
  containerElement.appendChild(quizCard);

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([containerElement]).catch(err => console.error(err));
  }

  const checkBtn = containerElement.querySelector('#checkQuizBtn');
  const showBtn = containerElement.querySelector('#showSolutionBtn');
  const feedbackArea = containerElement.querySelector('#quizFeedbackArea');
  const answerInput = containerElement.querySelector('#quizAnswerInput');

  showBtn.onclick = () => {
    feedbackArea.innerHTML = `
      <div style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-top: 10px;">
        <h4 style="color: var(--accent, #4cf2c2); margin-bottom: 8px;">Correct Answer:</h4>
        <div class="math-eq">\\[ ${data.correct_answer} \\]</div>
        <h4 style="color: var(--muted); margin-top: 12px; margin-bottom: 8px;">Explanation:</h4>
        <div class="step-desc">${data.explanation.replace(/\\$/g, '\\\\$')}</div>
      </div>
    `;
    showBtn.style.display = 'none';
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([feedbackArea]).catch(err => console.error(err));
    }
  };

  checkBtn.onclick = async () => {
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) return;
    
    checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    checkBtn.disabled = true;

    try {
      const payload = {
        user: 'math-quiz-check',
        message: `Grade this answer. Problem: ${data.quiz_problem}. Expected: ${data.correct_answer}. Student Answer: ${userAnswer}`,
        attachments: [],
        messages: [{ role: 'user', content: `Grade this answer. Problem: ${data.quiz_problem}. Expected: ${data.correct_answer}. Student Answer: ${userAnswer}` }]
      };
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();
      const grade = JSON.parse(resData.reply);
      
      const isCorrect = grade.is_correct;
      feedbackArea.innerHTML = \`
        <div style="padding: 12px; border-radius: 8px; background: \${isCorrect ? 'rgba(76, 242, 194, 0.1)' : 'rgba(255, 107, 107, 0.1)'}; border: 1px solid \${isCorrect ? 'rgba(76, 242, 194, 0.3)' : 'rgba(255, 107, 107, 0.3)'}; margin-top: 12px;">
          <h4 style="color: \${isCorrect ? 'var(--accent, #4cf2c2)' : 'var(--danger, #ff6b6b)'}; margin-bottom: 8px;">
            <i class="fas \${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i> \${isCorrect ? 'Correct!' : 'Not Quite'}
          </h4>
          <div>\${grade.feedback}</div>
        </div>
      \`;
      
      if (isCorrect) {
          showBtn.click(); // Auto show solution if they got it right
      }
      
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([feedbackArea]).catch(err => console.error(err));
      }
    } catch (err) {
      feedbackArea.innerHTML = '<div style="color: #ff6b6b; margin-top: 10px;">Failed to grade answer. Please try again.</div>';
    } finally {
      checkBtn.innerHTML = 'Check Answer';
      checkBtn.disabled = false;
    }
  };
}
