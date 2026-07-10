import { useState, useEffect, useRef, useCallback } from 'react'
import './SnakeGame.css'

const GRID_SIZE = 20
const INITIAL_SPEED = 150

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

const OPPOSITE = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

function getRandomPosition(snake, canvasWidth, canvasHeight) {
  const cols = Math.floor(canvasWidth / GRID_SIZE)
  const rows = Math.floor(canvasHeight / GRID_SIZE)
  let pos
  do {
    pos = {
      x: Math.floor(Math.random() * cols) * GRID_SIZE,
      y: Math.floor(Math.random() * rows) * GRID_SIZE,
    }
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y))
  return pos
}

export default function SnakeGame() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('idle') // idle, playing, paused, gameover
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake_high_score') || '0', 10)
  })
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [gridColor, setGridColor] = useState(true)

  const snakeRef = useRef([{ x: 200, y: 200 }])
  const foodRef = useRef(null)
  const directionRef = useRef('RIGHT')
  const nextDirectionRef = useRef('RIGHT')
  const gameLoopRef = useRef(null)
  const scoreRef = useRef(0)

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { width: 600, height: 400 }
    return { width: canvas.width, height: canvas.height }
  }, [])

  const resetGame = useCallback(() => {
    const { width, height } = getCanvasSize()
    snakeRef.current = [{ x: Math.floor(width / 40) * 20, y: Math.floor(height / 40) * 20 }]
    directionRef.current = 'RIGHT'
    nextDirectionRef.current = 'RIGHT'
    scoreRef.current = 0
    setScore(0)
    setSpeed(INITIAL_SPEED)
    foodRef.current = getRandomPosition(snakeRef.current, width, height)
  }, [getCanvasSize])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas

    // Background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    // Grid
    if (gridColor) {
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 0.5
      for (let x = 0; x < width; x += GRID_SIZE) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += GRID_SIZE) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // Food
    if (foodRef.current) {
      ctx.fillStyle = '#ef4444'
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(
        foodRef.current.x + GRID_SIZE / 2,
        foodRef.current.y + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Snake
    snakeRef.current.forEach((seg, i) => {
      const brightness = 1 - (i / snakeRef.current.length) * 0.5
      const g = Math.floor(200 * brightness)
      ctx.fillStyle = i === 0 ? '#4ade80' : `rgb(34, ${g}, 80)`
      ctx.shadowColor = i === 0 ? '#4ade80' : 'transparent'
      ctx.shadowBlur = i === 0 ? 6 : 0
      ctx.beginPath()
      ctx.roundRect(seg.x + 1, seg.y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4)
      ctx.fill()
      ctx.shadowBlur = 0
    })
  }, [gridColor])

  const gameLoop = useCallback(() => {
    const { width, height } = getCanvasSize()
    const snake = snakeRef.current
    directionRef.current = nextDirectionRef.current

    const dir = DIRECTIONS[directionRef.current]
    const head = { ...snake[0] }
    head.x += dir.x * GRID_SIZE
    head.y += dir.y * GRID_SIZE

    // Wall collision
    if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
      return false
    }

    // Self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      return false
    }

    snake.unshift(head)

    // Eat food
    if (foodRef.current && head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10
      setScore(scoreRef.current)
      foodRef.current = getRandomPosition(snake, width, height)

      // Speed up
      if (speed > 60) {
        setSpeed(prev => prev - 2)
      }
    } else {
      snake.pop()
    }

    return true
  }, [getCanvasSize, speed])

  const startGame = useCallback(() => {
    resetGame()
    setGameState('playing')
  }, [resetGame])

  const togglePause = useCallback(() => {
    setGameState(prev => (prev === 'playing' ? 'paused' : 'playing'))
  }, [])

  // Game loop effect
  useEffect(() => {
    if (gameState !== 'playing') return

    gameLoopRef.current = setInterval(() => {
      const alive = gameLoop()
      if (!alive) {
        setGameState('gameover')
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current)
          localStorage.setItem('snake_high_score', String(scoreRef.current))
        }
      }
      draw()
    }, speed)

    return () => clearInterval(gameLoopRef.current)
  }, [gameState, gameLoop, draw, speed, highScore])

  // Initial draw
  useEffect(() => {
    resetGame()
    draw()
  }, [resetGame, draw])

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      const keyMap = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
        W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame()
        } else {
          togglePause()
        }
        return
      }

      const dir = keyMap[e.key]
      if (dir) {
        e.preventDefault()
        if (OPPOSITE[dir] !== directionRef.current) {
          nextDirectionRef.current = dir
        }
        if (gameState === 'idle') {
          setGameState('playing')
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameState, startGame, togglePause])

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let touchStart = null

    const handleTouchStart = (e) => {
      e.preventDefault()
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    const handleTouchEnd = (e) => {
      if (!touchStart) return
      e.preventDefault()
      const dx = e.changedTouches[0].clientX - touchStart.x
      const dy = e.changedTouches[0].clientY - touchStart.y
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (Math.max(absDx, absDy) < 20) {
        // Tap -> start or pause
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame()
        } else {
          togglePause()
        }
        touchStart = null
        return
      }

      let dir
      if (absDx > absDy) {
        dir = dx > 0 ? 'RIGHT' : 'LEFT'
      } else {
        dir = dy > 0 ? 'DOWN' : 'UP'
      }

      if (OPPOSITE[dir] !== directionRef.current) {
        nextDirectionRef.current = dir
      }
      if (gameState === 'idle') setGameState('playing')
      touchStart = null
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [gameState, startGame, togglePause])

  const handleCanvasResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    canvas.width = Math.min(container.clientWidth, 800)
    canvas.height = Math.min(Math.floor(container.clientWidth * 0.6), 500)
    if (gameState === 'idle') {
      resetGame()
      draw()
    }
  }, [gameState, resetGame, draw])

  useEffect(() => {
    handleCanvasResize()
    window.addEventListener('resize', handleCanvasResize)
    return () => window.removeEventListener('resize', handleCanvasResize)
  }, [handleCanvasResize])

  return (
    <div className="snake-container">
      <div className="snake-header">
        <h2 className="snake-title">🐍 貪食蛇</h2>
        <div className="snake-stats">
          <div className="stat">
            <span className="stat-label">分數</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">最高分</span>
            <span className="stat-value high">{highScore}</span>
          </div>
        </div>
      </div>

      <div className="snake-canvas-wrapper">
        <canvas ref={canvasRef} className="snake-canvas" />

        {gameState === 'idle' && (
          <div className="snake-overlay">
            <div className="overlay-content">
              <div className="overlay-icon">🐍</div>
              <h3>貪食蛇</h3>
              <p>使用方向鍵或 WASD 控制蛇的移動</p>
              <p>吃食物得分，不要撞牆或咬到自己！</p>
              <button className="snake-btn start" onClick={startGame}>
                開始遊戲
              </button>
              <p className="hint">或按空白鍵開始</p>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="snake-overlay">
            <div className="overlay-content">
              <div className="overlay-icon">⏸️</div>
              <h3>暫停中</h3>
              <button className="snake-btn resume" onClick={togglePause}>
                繼續遊戲
              </button>
              <p className="hint">或按空白鍵繼續</p>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="snake-overlay">
            <div className="overlay-content">
              <div className="overlay-icon">💀</div>
              <h3>遊戲結束</h3>
              <p className="final-score">得分: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="new-record">🎉 新紀錄！</p>
              )}
              <button className="snake-btn restart" onClick={startGame}>
                再來一局
              </button>
              <p className="hint">或按空白鍵重新開始</p>
            </div>
          </div>
        )}
      </div>

      <div className="snake-controls">
        <button
          className={`ctrl-btn ${gridColor ? 'active' : ''}`}
          onClick={() => setGridColor(g => !g)}
        >
          網格 {gridColor ? 'ON' : 'OFF'}
        </button>
        {gameState === 'playing' && (
          <button className="ctrl-btn pause" onClick={togglePause}>
            暫停
          </button>
        )}
        {(gameState === 'paused' || gameState === 'gameover') && (
          <button className="ctrl-btn start" onClick={startGame}>
            重新開始
          </button>
        )}
      </div>

      <div className="snake-mobile-hint">
        手機玩家：滑動控制方向，點擊開始/暫停
      </div>
    </div>
  )
}
