// ── lock scroll during intro ──
document.documentElement.style.overflow = 'hidden'

// ── SOUND FILES ──
const bootSound    = new Audio('/static/sounds/boot.mp3')
const channelSound = new Audio('/static/sounds/channel.mp3')
const staticSound  = new Audio('/static/sounds/static.mp3')
staticSound.loop   = true
staticSound.volume = 0.08

function unlockAudio() {
    staticSound.play().then(() => staticSound.pause()).catch(() => {})
    channelSound.play().then(() => channelSound.pause()).catch(() => {})
}
document.addEventListener('click', unlockAudio, { once: true })

// ── SWORD CURSOR ──
const swordCursor = document.getElementById('cursor')

document.addEventListener('mousemove', (e) => {
    const x = Math.round(e.clientX)
    const y = Math.round(e.clientY)
    swordCursor.style.setProperty('--mouse-x', `${x}px`)
    swordCursor.style.setProperty('--mouse-y', `${y}px`)
    swordCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
})

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        swordCursor.classList.add('tebas')
        setTimeout(() => {
            swordCursor.classList.remove('tebas')
            const x = getComputedStyle(swordCursor).getPropertyValue('--mouse-x')
            const y = getComputedStyle(swordCursor).getPropertyValue('--mouse-y')
            swordCursor.style.transform = `translate3d(${x}, ${y}, 0)`
        }, 250)
    }
})

document.addEventListener('contextmenu', e => e.preventDefault())

// ── PLAYER ELEMENTS — grabbed immediately while DOM is ready ──
const playerWindow = document.getElementById('player-window')
const playerTrack  = document.getElementById('player-track-text')
const btnPlay      = document.getElementById('btn-play')
const btnStop      = document.getElementById('btn-stop')
const volumeSlider = document.getElementById('volume-slider')
const playerClose  = document.getElementById('player-close')
const visualCanvas = document.getElementById('visualizer-canvas')
const visCtx       = visualCanvas.getContext('2d')

// ── PLAYER STATE ──
let audioCtx       = null
let distortionNode = null
let lowPassFilter  = null
let sourceNode     = null
let analyserNode   = null
let gainNode       = null
let previewAudio   = null
let isPlaying      = false
let animFrameId    = null

// ── AUDIO GRAPH ──
function setupAudioGraph(audioEl) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()

    if (sourceNode) {
        try { sourceNode.disconnect() } catch(e) {}
    }

    sourceNode     = audioCtx.createMediaElementSource(audioEl)
    distortionNode = audioCtx.createWaveShaper()
    analyserNode   = audioCtx.createAnalyser()
    gainNode       = audioCtx.createGain()
    lowPassFilter  = audioCtx.createBiquadFilter()

    // distortion curve — old TV speaker warmth
    const samples = 256
    const curve   = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
        const x  = (i * 2) / samples - 1
        curve[i] = Math.max(-0.8, Math.min(0.8,
            x * 3 + Math.sin(x * Math.PI * 2) * 0.3
        ))
    }
    distortionNode.curve      = curve
    distortionNode.oversample = '4x'

    // low pass — cuts highs like old speaker
    lowPassFilter.type            = 'lowpass'
    lowPassFilter.frequency.value = 3500
    lowPassFilter.Q.value         = 0.8

    analyserNode.fftSize = 128
    gainNode.gain.value  = parseFloat(volumeSlider.value)

    // chain: source → distortion → lowpass → gain → analyser → out
    sourceNode.connect(distortionNode)
    distortionNode.connect(lowPassFilter)
    lowPassFilter.connect(gainNode)
    gainNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)
}

// ── VISUALIZER ──
function drawVisualizer() {
    if (!analyserNode) return
    const bufferLength = analyserNode.frequencyBinCount
    const dataArray    = new Uint8Array(bufferLength)
    analyserNode.getByteFrequencyData(dataArray)

    const w = visualCanvas.width
    const h = visualCanvas.height
    visCtx.fillStyle = '#000'
    visCtx.fillRect(0, 0, w, h)

    const barWidth = (w / bufferLength) * 2
    let x = 0
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h
        const r = Math.floor(245 * (dataArray[i] / 255))
        const g = Math.floor(203 * (dataArray[i] / 255))
        const b = Math.floor(214 * (dataArray[i] / 255))
        visCtx.fillStyle = `rgb(${r},${g},${b})`
        visCtx.fillRect(x, h - barHeight, barWidth - 1, barHeight)
        x += barWidth
    }
    animFrameId = requestAnimationFrame(drawVisualizer)
}

// ── LOAD PREVIEW ──
function loadPreview(previewUrl, trackName) {
    if (previewAudio) {
        previewAudio.pause()
        previewAudio = null
    }

    playerTrack.textContent = trackName || 'unknown track'
    playerWindow.classList.add('visible')
    btnPlay.textContent = '▶'
    isPlaying = false

    if (!previewUrl) return

    previewAudio             = new Audio()
    previewAudio.crossOrigin = 'anonymous'
    previewAudio.src         = previewUrl
    previewAudio.loop        = true

    setupAudioGraph(previewAudio)
}

// ── TOGGLE PLAY ──
function togglePlay() {
    if (!previewAudio) return
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()

    if (isPlaying) {
        previewAudio.pause()
        btnPlay.textContent = '▶'
        cancelAnimationFrame(animFrameId)
        isPlaying = false
    } else {
        previewAudio.play()
        btnPlay.textContent = '⏸'
        drawVisualizer()
        isPlaying = true
    }
}

// ── STOP ──
function stopPlayer() {
    if (!previewAudio) return
    previewAudio.pause()
    previewAudio.currentTime = 0
    btnPlay.textContent = '▶'
    cancelAnimationFrame(animFrameId)
    visCtx.fillStyle = '#000'
    visCtx.fillRect(0, 0, visualCanvas.width, visualCanvas.height)
    isPlaying = false
}

// ── PLAYER EVENT LISTENERS ──
btnPlay.addEventListener('click', togglePlay)
btnStop.addEventListener('click', stopPlayer)
playerClose.addEventListener('click', () => {
    stopPlayer()
    playerWindow.classList.remove('visible')
})
volumeSlider.addEventListener('input', () => {
    if (gainNode) gainNode.gain.value = parseFloat(volumeSlider.value)
})

// ── INTRO SEQUENCE ──
const introScreen   = document.getElementById('intro-screen')
const introStatus   = document.getElementById('intro-status')
const introProgress = document.getElementById('intro-progress')
const introHint     = document.getElementById('intro-hint')

let introStarted    = false
const SECOND_CLACK_MS = 3200

document.addEventListener('click',   startIntro, { once: true })
document.addEventListener('keydown', startIntro, { once: true })

function startIntro() {
    if (introStarted) return
    introStarted = true

    bootSound.volume = 1.0
    bootSound.play()

    introHint.style.display = 'none'
    introStatus.textContent = 'INITIALIZING...'
    introScreen.classList.add('shake')

    const progressInner = document.getElementById('intro-progress-inner')
    const TOTAL_BLOCKS  = 16
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const block = document.createElement('div')
        block.classList.add('progress-block')
        block.id = `block-${i}`
        progressInner.appendChild(block)
    }
    introProgress.style.display = 'flex'

    let currentBlock = 0
    const blockTimer = setInterval(() => {
        if (currentBlock < TOTAL_BLOCKS) {
            document.getElementById(`block-${currentBlock}`).classList.add('filled')
            currentBlock++
        } else {
            clearInterval(blockTimer)
        }
    }, SECOND_CLACK_MS / TOTAL_BLOCKS)

    setTimeout(() => {
        introScreen.classList.remove('shake')
        introStatus.textContent = 'SIGNAL ACQUIRED'

        setTimeout(() => {
            introScreen.style.transition = 'opacity 0.5s ease'
            introScreen.style.opacity    = '0'

            setTimeout(() => {
                introScreen.style.display = 'none'
                document.documentElement.style.overflow = 'auto'
                window.scrollTo({ top: 0, behavior: 'instant' })

                staticSound.currentTime = 0
                staticSound.volume      = 0
                staticSound.play()

                let staticVol = 0
                const staticFade = setInterval(() => {
                    staticVol += 0.01
                    if (staticVol >= 0.25) {
                        staticSound.volume = 0.25
                        clearInterval(staticFade)
                    } else {
                        staticSound.volume = staticVol
                    }
                }, 80)

            }, 500)
        }, 400)
    }, SECOND_CLACK_MS)
}

// ── MAIN ELEMENTS ──
const songInput        = document.getElementById('song-input')
const artistInput      = document.getElementById('artist-input')
const searchBtn        = document.getElementById('search-btn')
const resultSection    = document.getElementById('result-section')
const loading          = document.getElementById('loading')
const loadingText      = document.getElementById('loading-text')
const errorBox         = document.getElementById('error-box')
const errorMessage     = document.getElementById('error-message')
const result           = document.getElementById('result')
const resultTitle      = document.getElementById('result-title')
const resultArtist     = document.getElementById('result-artist')
const scoreValue       = document.getElementById('score-value')
const constellationImg = document.getElementById('constellation-img')
const topLineText      = document.getElementById('top-line-text')
const tryAnother       = document.getElementById('try-another')
const idCard           = document.getElementById('id-card')
const idShimmer        = document.getElementById('id-shimmer')

// ── ID CARD TILT ──
idCard.addEventListener('mousemove', (e) => {
    const rect    = idCard.getBoundingClientRect()
    const centerX = rect.left + rect.width  / 2
    const centerY = rect.top  + rect.height / 2
    const rotateX = ((e.clientY - centerY) / rect.height) * -12
    const rotateY = ((e.clientX - centerX) / rect.width)  *  12
    idCard.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    idShimmer.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(245,227,214,0.10) 0%, transparent 55%)`
})

idCard.addEventListener('mouseleave', () => {
    idCard.style.transform     = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
    idShimmer.style.background = `radial-gradient(circle at 50% 50%, rgba(245,227,214,0.06) 0%, transparent 60%)`
})

// ── STATE ──
let isLoading = false

// ── HELPERS ──
function showSection(section) {
    resultSection.classList.add('visible')
    loading.classList.remove('visible')
    errorBox.classList.remove('visible')
    result.classList.remove('visible')
    section.classList.add('visible')
}

function resetToSearch() {
    resultSection.classList.remove('visible')
    loading.classList.remove('visible')
    errorBox.classList.remove('visible')
    result.classList.remove('visible')
    songInput.value   = ''
    artistInput.value = ''
    songInput.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    stopPlayer()
    playerWindow.classList.remove('visible')
}

function updateLoadingText(text) {
    loadingText.textContent = text
}

function formatScore(score) {
    const sign = score >= 0 ? '+' : ''
    return `${sign}${score.toFixed(3)}`
}

// ── ANALYZE ──
async function analyze() {
    const song   = songInput.value.trim()
    const artist = artistInput.value.trim()

    if (!song || !artist) { songInput.focus(); return }
    if (isLoading) return
    isLoading = true

    channelSound.currentTime = 0
    channelSound.volume      = 0.1
    channelSound.play()

    showSection(loading)
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    updateLoadingText('fetching lyrics from Genius...')

    try {
        setTimeout(() => updateLoadingText('analyzing emotions line by line...'), 2500)
        setTimeout(() => updateLoadingText('generating your constellation...'),   6000)

        const response = await fetch('/analyze', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ song_title: song, artist_name: artist })
        })

        const data = await response.json()

        if (!response.ok) {
            showSection(errorBox)
            errorMessage.textContent = data.error || 'something went wrong.'
            isLoading = false
            return
        }

        resultTitle.textContent  = data.title
        resultArtist.textContent = data.artist
        scoreValue.textContent   = formatScore(data.score)
        scoreValue.style.color   = data.score >= 0 ? '#F5E3D6' : '#A5CBD9'
        topLineText.textContent  = `"${data.top_line}"`
        constellationImg.src     = data.image_url + '?t=' + Date.now()

        // load preview player
        loadPreview(
            data.preview_url || null,
            `${data.title} — ${data.artist}`
        )

        constellationImg.onload = () => {
            showSection(result)
            isLoading = false
        }

        constellationImg.onerror = () => {
            showSection(errorBox)
            errorMessage.textContent = 'image failed to load.'
            isLoading = false
        }

    } catch (err) {
        showSection(errorBox)
        errorMessage.textContent = 'could not connect to server.'
        isLoading = false
    }
}

// ── EVENT LISTENERS ──
searchBtn.addEventListener('click', analyze)
songInput.addEventListener('keydown',  (e) => { if (e.key === 'Enter') artistInput.focus() })
artistInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') analyze() })
tryAnother.addEventListener('click', resetToSearch)