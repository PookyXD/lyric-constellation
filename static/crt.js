function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class ScreenEffect {
    constructor(parent, options) {
        this.parent = parent;
        if (typeof parent === "string") {
            this.parent = document.querySelector(parent);
        }

        this.config = Object.assign({}, {}, options)
        this.effects = {};
        this.events  = { resize: this.onResize.bind(this) };

        window.addEventListener("resize", this.events.resize, false);
        this.render();
    }

    render() {
        const container = document.createElement("div");
        container.classList.add("screen-container");

        const wrapper1 = document.createElement("div");
        wrapper1.classList.add("screen-wrapper");

        const wrapper2 = document.createElement("div");
        wrapper2.classList.add("screen-wrapper");

        const wrapper3 = document.createElement("div");
        wrapper3.classList.add("screen-wrapper");

        wrapper1.appendChild(wrapper2);
        wrapper2.appendChild(wrapper3);
        container.appendChild(wrapper1);

        this.parent.parentNode.insertBefore(container, this.parent);
        wrapper3.appendChild(this.parent);

        this.nodes = { container, wrapper1, wrapper2, wrapper3 };
        this.onResize();
    }

    onResize() {
        this.rect = this.parent.getBoundingClientRect();
        if (this.effects.vcr && this.effects.vcr.enabled) {
            this.generateVCRNoise();
        }
    }

    add(type, options) {
        const config = Object.assign({}, { fps: 30, blur: 1 }, options);
        const that   = this;

        if (type === "snow") {
            const canvas = document.createElement("canvas");
            const ctx    = canvas.getContext("2d");
            canvas.classList.add(type);
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            this.nodes.wrapper2.appendChild(canvas);

            function animateSnow() {
                that.generateSnow(ctx);
                that.snowframe = requestAnimationFrame(animateSnow);
            }
            animateSnow();

            this.effects[type] = {
                wrapper: this.nodes.wrapper2,
                node: canvas, enabled: true, config
            };
            return this;
        }

        if (type === "vcr") {
            const canvas = document.createElement("canvas");
            canvas.classList.add(type);
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            this.nodes.wrapper2.appendChild(canvas);

            this.effects[type] = {
                wrapper: this.nodes.wrapper2,
                node: canvas,
                ctx:  canvas.getContext("2d"),
                enabled: true, config
            };
            this.generateVCRNoise();
            return this;
        }

        let node    = false;
        let wrapper = this.nodes.wrapper2;

        switch (type) {
            case "wobblex":
            case "wobbley":
                wrapper.classList.add(type);
                break;
            case "scanlines":
                node = document.createElement("div");
                node.classList.add(type);
                wrapper.appendChild(node);
                break;
            case "vignette":
                wrapper = this.nodes.container;
                node    = document.createElement("div");
                node.classList.add(type);
                wrapper.appendChild(node);
                break;
        }

        this.effects[type] = { wrapper, node, enabled: true, config };
        return this;
    }

    generateVCRNoise() {
        const config = this.effects.vcr.config;

        if (config.fps >= 60) {
            cancelAnimationFrame(this.vcrInterval);
            const animate = () => {
                this.renderTrackingNoise();
                this.vcrInterval = requestAnimationFrame(animate);
            };
            animate();
        } else {
            clearInterval(this.vcrInterval);
            this.vcrInterval = setInterval(() => {
                this.renderTrackingNoise();
            }, 1000 / config.fps);
        }
    }

    generateSnow(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const d = ctx.createImageData(w, h);
        const b = new Uint32Array(d.data.buffer);
        for (let i = 0; i < b.length; i++) {
            b[i] = ((255 * Math.random()) | 0) << 24;
        }
        ctx.putImageData(d, 0, 0);
    }

    renderTrackingNoise(radius = 2) {
        const canvas = this.effects.vcr.node;
        const ctx    = this.effects.vcr.ctx;
        const config = this.effects.vcr.config;
        let posy1    = config.miny  || 0;
        let posy2    = config.maxy  || canvas.height;
        let posy3    = config.miny2 || 0;
        const num    = config.num   || 20;
        const xmax   = canvas.width;

        canvas.style.filter = `blur(${config.blur}px)`;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.beginPath();

        for (let i = 0; i <= num; i++) {
            const x  = Math.random() * xmax;
            const y1 = getRandomInt(posy1 += 3, posy2);
            const y2 = getRandomInt(0, posy3 -= 3);
            ctx.fillRect(x, y1, radius, radius);
            ctx.fillRect(x, y2, radius, radius);
            ctx.fill();
            this.renderTail(ctx, x, y1, radius);
            this.renderTail(ctx, x, y2, radius);
        }
        ctx.closePath();
    }

    renderTail(ctx, x, y, radius) {
        const n    = getRandomInt(1, 50);
        const dirs = [1, -1];
        const dir  = dirs[Math.floor(Math.random() * dirs.length)];
        let rd     = radius;

        for (let i = 0; i < n; i++) {
            let r  = getRandomInt((rd -= 0.01), radius);
            let dx = getRandomInt(1, 4) * dir;
            radius -= 0.1;
            ctx.fillRect((x += dx), y, r, r);
            ctx.fill();
        }
    }
}

// ── initialize on page load ──
window.addEventListener('DOMContentLoaded', () => {
    const crtScreen = document.querySelector('#crt-screen')
    if (!crtScreen) return

    const fx = new ScreenEffect('#crt-screen')

    fx
        .add('scanlines')
        .add('vignette')
        .add('wobbley')
        .add('vcr', {
            miny:  220,
            miny2: 220,
            num:   15,
            fps:   60,
            blur:  0.5
        })
        .add('snow', {
            opacity: 0.05
        })
})