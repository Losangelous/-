import { useState, useEffect } from 'react'
import data from './data.json'
import SnakeGame from './components/SnakeGame'
import './index.css'

function App() {
  const [currentView, setCurrentView] = useState('quiz') // 'quiz' | 'snake'
  const [category, setCategory] = useState('motorcycle')
  const [viewMode, setViewMode] = useState('overview') // 'overview' | 'quiz' | 'mistakes'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  // Track selected option for currently viewed question (before they move to next)
  const [selectedOption, setSelectedOption] = useState(null)
  
  // Progress: { [questionId]: { isCorrect: boolean, selectedOption: string } }
  const [userProgress, setUserProgress] = useState({})

  // Load progress from local storage when category changes
  useEffect(() => {
    const saved = localStorage.getItem(`driving_progress_${category}`)
    if (saved) {
      try {
        setUserProgress(JSON.parse(saved))
      } catch (e) {
        setUserProgress({})
      }
    } else {
      setUserProgress({})
    }
  }, [category])

  // Save progress to local storage
  const saveProgress = (progress) => {
    setUserProgress(progress)
    localStorage.setItem(`driving_progress_${category}`, JSON.stringify(progress))
  }

  // Derived state: filtered questions based on mode
  const allCategoryQuestions = data.filter(q => q.category === category)
  const questions = viewMode.startsWith('mistakes')
    ? allCategoryQuestions.filter(q => userProgress[q.id] && !userProgress[q.id].isCorrect)
    : allCategoryQuestions

  const currentQuestion = questions[currentQuestionIndex]
  const progressRecord = currentQuestion ? userProgress[currentQuestion.id] : null
  const hasAnswered = !!progressRecord || selectedOption !== null

  const resolveAssetPath = (path) => {
    if (!path) return path
    if (/^https?:\/\//.test(path)) return path
    if (path.startsWith('/')) {
      return `${import.meta.env.BASE_URL}${path.slice(1)}`
    }
    return path
  }

  // Switch category
  const handleCategoryChange = (newCat) => {
    setCategory(newCat)
    setViewMode('overview')
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
  }

  // Answer a question
  const handleOptionClick = (opt) => {
    if (hasAnswered) return
    setSelectedOption(opt)
    
    const isCorrect = opt === currentQuestion.answer
    const newProgress = {
      ...userProgress,
      [currentQuestion.id]: { isCorrect, selectedOption: opt }
    }
    saveProgress(newProgress)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
    }
  }
  
  const handleJumpToQuestion = (index) => {
    setCurrentQuestionIndex(index)
    setSelectedOption(null)
    // If they were in overview, go to quiz
    // If they were in mistakes, stay in mistakes but show that question
    if (viewMode === 'overview') setViewMode('quiz')
  }

  // Options parsing logic
  let currentOptions = ['1', '2', '3']
  if (currentQuestion && ['O', 'X'].includes(currentQuestion.answer)) {
    currentOptions = ['O', 'X']
  }

  const renderOverview = () => {
    const list = viewMode === 'mistakes' ? questions : allCategoryQuestions
    const total = list.length
    const correctCount = list.filter(q => userProgress[q.id]?.isCorrect === true).length
    const incorrectCount = list.filter(q => userProgress[q.id]?.isCorrect === false).length
    const unansweredCount = list.filter(q => !userProgress[q.id]).length

    return (
      <div className="overview-container">
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          {viewMode === 'mistakes' ? '錯題整理' : '題庫總覽'}
        </h2>
        <div className="overview-stats">
          <div className="stat-item"><div className="stat-dot correct"></div> 答對: {correctCount}</div>
          <div className="stat-item"><div className="stat-dot incorrect"></div> 答錯: {incorrectCount}</div>
          <div className="stat-item"><div className="stat-dot unanswered"></div> 未答: {unansweredCount}</div>
        </div>
        
        {list.length === 0 && viewMode === 'mistakes' ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>太棒了！目前沒有錯題。</div>
        ) : (
          <div className="grid">
            {list.map((q, idx) => {
              const status = userProgress[q.id]
              let className = 'grid-item'
              if (status) {
                className += status.isCorrect ? ' correct' : ' incorrect'
              }
              return (
                <div 
                  key={q.id} 
                  className={className}
                  onClick={() => handleJumpToQuestion(idx)}
                >
                  {q.id.replace('危感-', '影片')}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderQuiz = () => {
    if (!currentQuestion) return null

    const actualSelectedOption = progressRecord ? progressRecord.selectedOption : selectedOption
    const isCorrect = progressRecord ? progressRecord.isCorrect : (actualSelectedOption === currentQuestion.answer)

    return (
      <div className="question-card">
        <div className="card-header">
          <button className="back-btn" onClick={() => {
            setViewMode(viewMode.startsWith('mistakes') ? 'mistakes-overview' : 'overview')
            setSelectedOption(null)
          }}>
            ← 返回總覽
          </button>
          <span>
            {viewMode === 'mistakes' ? '錯題模式' : '一般模式'} - 第 {currentQuestionIndex + 1} / {questions.length} 題
          </span>
        </div>

        <div style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
          題號: {currentQuestion.id}
        </div>

        {currentQuestion.type === 'video' && (
          <div className="video-container">
            <video 
              controls 
              width="100%" 
              src={resolveAssetPath(`/videos/${currentQuestion.videoId}.mp4`)}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            >
              Your browser does not support the video tag.
            </video>
            <div className="video-placeholder" style={{ display: 'none' }}>
              <p>影片檔案 <b>{currentQuestion.videoId}.mp4</b> 尚未下載至 public/videos/ 資料夾。</p>
              <p style={{ marginTop: '1rem' }}>
                <a href="https://reurl.cc/zQj3Ge" target="_blank" rel="noreferrer">
                  點此前往雲端硬碟觀看影片
                </a>
              </p>
            </div>
          </div>
        )}

        {(currentQuestion.imagePaths?.length || currentQuestion.imagePath) && (
          <div className="image-container" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            {(currentQuestion.imagePaths ?? [currentQuestion.imagePath]).map((imagePath, idx) => (
              <img 
                key={`${currentQuestion.id}-${idx}`}
                src={resolveAssetPath(imagePath)} 
                alt={`題目圖片 ${idx + 1}`} 
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', margin: '0 0.5rem 0.5rem 0' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        )}

        <div className="question-text">
          {currentQuestion.question}
        </div>

        <div className="options-container">
          {currentOptions.map((opt) => {
            let className = 'option-btn'
            if (hasAnswered) {
              if (opt === currentQuestion.answer) {
                className += ' correct'
              } else if (opt === actualSelectedOption) {
                className += ' incorrect'
              }
            }

            return (
              <button
                key={opt}
                className={className}
                onClick={() => handleOptionClick(opt)}
                disabled={hasAnswered}
              >
                選項 {opt}
                {hasAnswered && opt === currentQuestion.answer && <span>✓</span>}
                {hasAnswered && opt === actualSelectedOption && opt !== currentQuestion.answer && <span>✗</span>}
              </button>
            )
          })}
        </div>

        {hasAnswered && (
          <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '🎉 答對了！' : `❌ 答錯了，正確答案是 ${currentQuestion.answer}。`}
          </div>
        )}

        {hasAnswered && (
          <div className="nav-buttons">
            {currentQuestionIndex < questions.length - 1 && (
              <button className="action-btn" onClick={handleNext}>
                下一題
              </button>
            )}
            {currentQuestionIndex === questions.length - 1 && (
              <button className="action-btn secondary" onClick={() => setViewMode(viewMode.startsWith('mistakes') ? 'mistakes-overview' : 'overview')}>
                回總覽
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (currentView === 'snake') {
    return (
      <div className="app-container">
        <div className="header">
          <h1>🐍 貪食蛇遊戲</h1>
          <div className="controls">
            <button
              className="btn"
              onClick={() => setCurrentView('quiz')}
            >
              ← 回到題庫
            </button>
          </div>
        </div>
        <SnakeGame />
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>駕照筆試與危險感知測驗</h1>
        <div className="controls">
          <button
            className={`btn ${category === 'car' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('car')}
          >
            汽車 (Car)
          </button>
          <button
            className={`btn ${category === 'motorcycle' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('motorcycle')}
          >
            機車 (Motorcycle)
          </button>
          <button
            className={`btn warning ${viewMode.startsWith('mistakes') ? 'active' : ''}`}
            onClick={() => {
              setViewMode(viewMode.startsWith('mistakes') ? 'overview' : 'mistakes-overview')
              setSelectedOption(null)
            }}
          >
            錯題整理
          </button>
          <button
            className="btn"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
            onClick={() => {
              if (window.confirm('確定要清除目前車種的所有作答紀錄嗎？')) {
                saveProgress({})
              }
            }}
          >
            清除紀錄
          </button>
          <button
            className="btn"
            style={{ borderColor: '#4ade80', color: '#4ade80' }}
            onClick={() => setCurrentView('snake')}
          >
            🐍 貪食蛇
          </button>
        </div>
      </div>

      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'quiz' && renderQuiz()}
      
      {viewMode === 'mistakes-overview' && (
        <div className="overview-container">
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#ef4444' }}>錯題整理</h2>
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>太棒了！目前沒有錯題。</div>
          ) : (
            <div className="grid">
              {questions.map((q, idx) => (
                <div 
                  key={q.id} 
                  className="grid-item incorrect"
                  onClick={() => {
                    setCurrentQuestionIndex(idx)
                    setSelectedOption(null)
                    setViewMode('mistakes-quiz')
                  }}
                >
                  {q.id.replace('危感-', '影片')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {viewMode === 'mistakes-quiz' && renderQuiz()}
    </div>
  )
}

export default App
