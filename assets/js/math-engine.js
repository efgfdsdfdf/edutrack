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
    quizBtn.onclick = () => {
      const problemInput = document.getElementById('problemInput');
      if (problemInput) {
        problemInput.value = `Generate a new practice problem similar to this one: ${data.problem}, and DO NOT solve it immediately. Just give me the problem to solve.`;
        // Optionally auto-click solve
        const solveBtn = document.getElementById('solveBtn');
        if (solveBtn) solveBtn.click();
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
