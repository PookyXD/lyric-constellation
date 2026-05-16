// ── SOUND FILES ──
const bootSound    = new Audio('/static/sounds/boot.mp3')
const channelSound = new Audio('/static/sounds/channel.mp3')
const staticSound  = new Audio('/static/sounds/static.mp3')

function unlockAudio() {
    staticSound.play().then(() => staticSound.pause()).catch(() => {})
    channelSound.play().then(() => channelSound.pause()).catch(() => {})
}
document.addEventListener('click', unlockAudio, { once: true })

staticSound.loop   = true
staticSound.volume = 0.08

// ── INTRO SEQUENCE ──
const introScreen  = document.getElementById('intro-screen')
const introStatus  = document.getElementById('intro-status')
const introProgress = document.getElementById('intro-progress')
const introProgressBar = document.getElementById('intro-progress-bar')
const introHint    = document.getElementById('intro-hint')
const mainContent  = document.getElementById('main-content')

let introStarted = false

// second clack timestamp in ms — tuned
const SECOND_CLACK_MS = 3200

document.addEventListener('click', startIntro, { once: true })
document.addEventListener('keydown', startIntro, { once: true })

function startIntro() {
    if (introStarted) return
    introStarted = true

    // play boot sound
    bootSound.volume = 1.0
    bootSound.play()

    // hide hint
    introHint.style.display = 'none'

    // start shaking and show initializing
    introStatus.textContent = 'INITIALIZING...'
    introScreen.classList.add('shake')

    // build 16 blocks
    const progressInner = document.getElementById('intro-progress-inner')
    const TOTAL_BLOCKS = 16
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const block = document.createElement('div')
        block.classList.add('progress-block')
        block.id = `block-${i}`
        progressInner.appendChild(block)
    }

    introProgress.style.display = 'flex'

    // fill blocks one by one over SECOND_CLACK_MS
    let currentBlock = 0
    const blockInterval = SECOND_CLACK_MS / TOTAL_BLOCKS
    const blockTimer = setInterval(() => {
        if (currentBlock < TOTAL_BLOCKS) {
            document.getElementById(`block-${currentBlock}`).classList.add('filled')
            currentBlock++
        } else {
            clearInterval(blockTimer)
        }
    }, blockInterval)

    // when second clack hits — stop shake, load main site
    setTimeout(() => {
        introScreen.classList.remove('shake')
        introStatus.textContent = 'SIGNAL ACQUIRED'

        setTimeout(() => {
            introScreen.style.transition = 'opacity 0.5s ease'
            introScreen.style.opacity    = '0'

            setTimeout(() => {
                introScreen.style.display = 'none'
                mainContent.classList.add('visible')
                staticSound.currentTime = 0
                staticSound.volume = 0
                staticSound.play()

                // fade in static over 2 seconds
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

// ── ELEMENTS ──
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

// ── CUSTOM CURSOR ──
const cursor    = document.createElement('div')
const cursorDot = document.createElement('div')
cursor.classList.add('custom-cursor')
cursorDot.classList.add('cursor-dot')
document.body.appendChild(cursor)
document.body.appendChild(cursorDot)

let mouseX = 0, mouseY = 0
let dotX = 0,   dotY = 0

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    cursor.style.left = mouseX + 'px'
    cursor.style.top  = mouseY + 'px'
})

// dot follows with lag
function animateDot() {
    dotX += (mouseX - dotX) * 0.15
    dotY += (mouseY - dotY) * 0.15
    cursorDot.style.left = dotX + 'px'
    cursorDot.style.top  = dotY + 'px'
    requestAnimationFrame(animateDot)
}
animateDot()

// cursor grows on hoverable elements
document.querySelectorAll('button, input, a').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'))
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'))
})

// ── ID CARD 3D TILT ──
idCard.addEventListener('mousemove', (e) => {
    const rect   = idCard.getBoundingClientRect()
    const centerX = rect.left + rect.width  / 2
    const centerY = rect.top  + rect.height / 2
    const rotateX = ((e.clientY - centerY) / rect.height) * -12
    const rotateY = ((e.clientX - centerX) / rect.width)  *  12

    idCard.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

    // shimmer follows cursor
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    idShimmer.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(201,168,76,0.10) 0%, transparent 55%)`
})

idCard.addEventListener('mouseleave', () => {
    idCard.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
    idShimmer.style.background = `radial-gradient(circle at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 60%)`
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
    songInput.value = ''
    artistInput.value = ''
    songInput.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function updateLoadingText(text) {
    loadingText.textContent = text
}

function formatScore(score) {
    const sign = score >= 0 ? '+' : ''
    return `${sign}${score.toFixed(3)}`
}


// ── MAIN ANALYZE FUNCTION ──
async function analyze() {
    const song   = songInput.value.trim()
    const artist = artistInput.value.trim()

    if (!song || !artist) {
        songInput.focus()
        return
    }

    if (isLoading) return
    isLoading = true

    channelSound.currentTime = 0
    channelSound.volume = 0.1
    channelSound.play()

    // scroll down to result section
    showSection(loading)
    setTimeout(() => {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    updateLoadingText('fetching lyrics from Genius...')

    try {
        // simulate loading stages for better UX
        setTimeout(() => updateLoadingText('analyzing emotions line by line...'), 2500)
        setTimeout(() => updateLoadingText('generating your constellation...'), 6000)

        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                song_title:  song,
                artist_name: artist
            })
        })

        const data = await response.json()

        if (!response.ok) {
            showSection(errorBox)
            errorMessage.textContent = data.error || 'something went wrong.'
            isLoading = false
            return
        }

        // populate result
        resultTitle.textContent    = data.title
        resultArtist.textContent   = data.artist
        scoreValue.textContent     = formatScore(data.score)
        scoreValue.style.color     = data.score >= 0 ? '#C9A84C' : '#6EC6FF'
        topLineText.textContent    = `"${data.top_line}"`
        constellationImg.src       = data.image_url + '?t=' + Date.now()

        // wait for image to load then show result
        constellationImg.onload = () => {
            showSection(result)
            isLoading = false
        }

        constellationImg.onerror = () => {
            showSection(errorBox)
            errorMessage.textContent = 'constellation generated but image failed to load.'
            isLoading = false
        }

    } catch (err) {
        showSection(errorBox)
        errorMessage.textContent = 'could not connect to the server. is it running?'
        isLoading = false
    }
}


// ── EVENT LISTENERS ──
searchBtn.addEventListener('click', analyze)

// enter key on either input triggers search
songInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') artistInput.focus()
})
artistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') analyze()
})

// try another song resets everything
tryAnother.addEventListener('click', resetToSearch)