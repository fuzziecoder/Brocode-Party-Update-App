import React, { useEffect, useRef } from 'react';

interface ColorRGB {
    r: number;
    g: number;
    b: number;
}

interface SplashCursorProps {
    SIM_RESOLUTION?: number;
    DYE_RESOLUTION?: number;
    DENSITY_DISSIPATION?: number;
    VELOCITY_DISSIPATION?: number;
    PRESSURE?: number;
    CURL?: number;
    SPLAT_RADIUS?: number;
    SPLAT_FORCE?: number;
    SHADING?: boolean;
    COLOR_UPDATE_SPEED?: number;
}

interface Pointer {
    id: number;
    texcoordX: number;
    texcoordY: number;
    prevTexcoordX: number;
    prevTexcoordY: number;
    deltaX: number;
    deltaY: number;
    down: boolean;
    moved: boolean;
    color: ColorRGB;
}

function pointerPrototype(): Pointer {
    return {
        id: -1,
        texcoordX: 0,
        texcoordY: 0,
        prevTexcoordX: 0,
        prevTexcoordY: 0,
        deltaX: 0,
        deltaY: 0,
        down: false,
        moved: false,
        color: { r: 0, g: 0, b: 0 }
    };
}

const SplashCursor: React.FC<SplashCursorProps> = ({
    SIM_RESOLUTION = 128,
    DYE_RESOLUTION = 1440,
    DENSITY_DISSIPATION = 3.5,
    VELOCITY_DISSIPATION = 2,
    PRESSURE = 0.1,
    CURL = 3,
    SPLAT_RADIUS = 0.2,
    SPLAT_FORCE = 6000,
    SHADING = true,
    COLOR_UPDATE_SPEED = 10
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let pointers: Pointer[] = [pointerPrototype()];
        let animationId: number;

        const config = {
            SIM_RESOLUTION,
            DYE_RESOLUTION,
            DENSITY_DISSIPATION,
            VELOCITY_DISSIPATION,
            PRESSURE,
            PRESSURE_ITERATIONS: 20,
            CURL,
            SPLAT_RADIUS,
            SPLAT_FORCE,
            SHADING,
            COLOR_UPDATE_SPEED
        };

        const gl = canvas.getContext('webgl2', {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false
        }) as WebGL2RenderingContext | null;

        if (!gl) {
            console.warn('WebGL2 not supported, SplashCursor disabled');
            return;
        }

        gl.getExtension('EXT_color_buffer_float');
        const supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');

        gl.clearColor(0, 0, 0, 0);

        const halfFloatTexType = gl.HALF_FLOAT;
        const formatRGBA = { internalFormat: gl.RGBA16F, format: gl.RGBA };
        const formatRG = { internalFormat: gl.RG16F, format: gl.RG };
        const formatR = { internalFormat: gl.R16F, format: gl.RED };

        function compileShader(type: number, source: string): WebGLShader | null {
            const shader = gl!.createShader(type);
            if (!shader) return null;
            gl!.shaderSource(shader, source);
            gl!.compileShader(shader);
            return shader;
        }

        function createProgram(vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null): WebGLProgram | null {
            if (!vertexShader || !fragmentShader) return null;
            const program = gl!.createProgram();
            if (!program) return null;
            gl!.attachShader(program, vertexShader);
            gl!.attachShader(program, fragmentShader);
            gl!.linkProgram(program);
            return program;
        }

        function getUniforms(program: WebGLProgram) {
            const uniforms: Record<string, WebGLUniformLocation | null> = {};
            const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
            for (let i = 0; i < count; i++) {
                const info = gl!.getActiveUniform(program, i);
                if (info) uniforms[info.name] = gl!.getUniformLocation(program, info.name);
            }
            return uniforms;
        }

        const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL, vR, vT, vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

        const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `);

        const displayShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
      }
    `);

        const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `);

        const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }
    `);

        const copyShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `);

        const splatProgram = createProgram(baseVertexShader, splatShader);
        const displayProgram = createProgram(baseVertexShader, displayShader);
        const clearProgram = createProgram(baseVertexShader, clearShader);
        const advectionProgram = createProgram(baseVertexShader, advectionShader);
        const copyProgram = createProgram(baseVertexShader, copyShader);

        const splatUniforms = splatProgram ? getUniforms(splatProgram) : {};
        const displayUniforms = displayProgram ? getUniforms(displayProgram) : {};
        const clearUniforms = clearProgram ? getUniforms(clearProgram) : {};
        const advectionUniforms = advectionProgram ? getUniforms(advectionProgram) : {};
        const copyUniforms = copyProgram ? getUniforms(copyProgram) : {};

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        const elemBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elemBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        interface FBO {
            texture: WebGLTexture;
            fbo: WebGLFramebuffer;
            width: number;
            height: number;
            attach: (id: number) => number;
        }

        interface DoubleFBO {
            read: FBO;
            write: FBO;
            swap: () => void;
        }

        function createFBO(w: number, h: number, internalFormat: number, format: number): FBO {
            gl!.activeTexture(gl!.TEXTURE0);
            const texture = gl!.createTexture()!;
            gl!.bindTexture(gl!.TEXTURE_2D, texture);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
            gl!.texImage2D(gl!.TEXTURE_2D, 0, internalFormat, w, h, 0, format, halfFloatTexType, null);
            const fbo = gl!.createFramebuffer()!;
            gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
            gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
            gl!.viewport(0, 0, w, h);
            gl!.clear(gl!.COLOR_BUFFER_BIT);
            return {
                texture, fbo, width: w, height: h,
                attach(id: number) {
                    gl!.activeTexture(gl!.TEXTURE0 + id);
                    gl!.bindTexture(gl!.TEXTURE_2D, texture);
                    return id;
                }
            };
        }

        function createDoubleFBO(w: number, h: number, internalFormat: number, format: number): DoubleFBO {
            let fbo1 = createFBO(w, h, internalFormat, format);
            let fbo2 = createFBO(w, h, internalFormat, format);
            return {
                read: fbo1,
                write: fbo2,
                swap() { const tmp = this.read; this.read = this.write; this.write = tmp; }
            };
        }

        function blit(target: FBO | null) {
            if (!target) {
                gl!.viewport(0, 0, gl!.drawingBufferWidth, gl!.drawingBufferHeight);
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
            } else {
                gl!.viewport(0, 0, target.width, target.height);
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
            }
            gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
        }

        const simRes = Math.round(config.SIM_RESOLUTION);
        const dyeRes = Math.round(config.DYE_RESOLUTION);

        let dye = createDoubleFBO(dyeRes, dyeRes, formatRGBA.internalFormat, formatRGBA.format);
        let velocity = createDoubleFBO(simRes, simRes, formatRG.internalFormat, formatRG.format);

        function scaleByPixelRatio(input: number) {
            return Math.floor(input * (window.devicePixelRatio || 1));
        }

        function resizeCanvas() {
            const width = scaleByPixelRatio(canvas!.clientWidth);
            const height = scaleByPixelRatio(canvas!.clientHeight);
            if (canvas!.width !== width || canvas!.height !== height) {
                canvas!.width = width;
                canvas!.height = height;
                return true;
            }
            return false;
        }

        function HSVtoRGB(h: number, s: number, v: number): ColorRGB {
            let r = 0, g = 0, b = 0;
            const i = Math.floor(h * 6);
            const f = h * 6 - i;
            const p = v * (1 - s);
            const q = v * (1 - f * s);
            const t = v * (1 - (1 - f) * s);
            switch (i % 6) {
                case 0: r = v; g = t; b = p; break;
                case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = t; break;
                case 3: r = p; g = q; b = v; break;
                case 4: r = t; g = p; b = v; break;
                case 5: r = v; g = p; b = q; break;
            }
            return { r: r * 0.15, g: g * 0.15, b: b * 0.15 };
        }

        function generateColor(): ColorRGB {
            return HSVtoRGB(Math.random(), 1.0, 1.0);
        }

        function splat(x: number, y: number, dx: number, dy: number, color: ColorRGB) {
            if (!splatProgram) return;
            gl!.useProgram(splatProgram);
            if (splatUniforms.uTarget) gl!.uniform1i(splatUniforms.uTarget, velocity.read.attach(0));
            if (splatUniforms.aspectRatio) gl!.uniform1f(splatUniforms.aspectRatio, canvas!.width / canvas!.height);
            if (splatUniforms.point) gl!.uniform2f(splatUniforms.point, x, y);
            if (splatUniforms.color) gl!.uniform3f(splatUniforms.color, dx, dy, 0);
            if (splatUniforms.radius) gl!.uniform1f(splatUniforms.radius, config.SPLAT_RADIUS / 100);
            blit(velocity.write);
            velocity.swap();

            if (splatUniforms.uTarget) gl!.uniform1i(splatUniforms.uTarget, dye.read.attach(0));
            if (splatUniforms.color) gl!.uniform3f(splatUniforms.color, color.r, color.g, color.b);
            blit(dye.write);
            dye.swap();
        }

        function step(dt: number) {
            gl!.disable(gl!.BLEND);

            if (advectionProgram) {
                gl!.useProgram(advectionProgram);
                if (advectionUniforms.texelSize) gl!.uniform2f(advectionUniforms.texelSize, 1 / simRes, 1 / simRes);
                if (advectionUniforms.uVelocity) gl!.uniform1i(advectionUniforms.uVelocity, velocity.read.attach(0));
                if (advectionUniforms.uSource) gl!.uniform1i(advectionUniforms.uSource, velocity.read.attach(0));
                if (advectionUniforms.dt) gl!.uniform1f(advectionUniforms.dt, dt);
                if (advectionUniforms.dissipation) gl!.uniform1f(advectionUniforms.dissipation, config.VELOCITY_DISSIPATION);
                blit(velocity.write);
                velocity.swap();

                if (advectionUniforms.uSource) gl!.uniform1i(advectionUniforms.uSource, dye.read.attach(1));
                if (advectionUniforms.dissipation) gl!.uniform1f(advectionUniforms.dissipation, config.DENSITY_DISSIPATION);
                blit(dye.write);
                dye.swap();
            }
        }

        function render() {
            gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
            gl!.enable(gl!.BLEND);
            if (displayProgram) {
                gl!.useProgram(displayProgram);
                if (displayUniforms.uTexture) gl!.uniform1i(displayUniforms.uTexture, dye.read.attach(0));
                blit(null);
            }
        }

        let lastTime = Date.now();
        let colorTimer = 0;

        function updateFrame() {
            const now = Date.now();
            let dt = (now - lastTime) / 1000;
            dt = Math.min(dt, 0.016);
            lastTime = now;

            resizeCanvas();

            colorTimer += dt * config.COLOR_UPDATE_SPEED;
            if (colorTimer >= 1) {
                colorTimer = 0;
                pointers.forEach(p => { p.color = generateColor(); });
            }

            pointers.forEach(p => {
                if (p.moved) {
                    p.moved = false;
                    const dx = p.deltaX * config.SPLAT_FORCE;
                    const dy = p.deltaY * config.SPLAT_FORCE;
                    splat(p.texcoordX, p.texcoordY, dx, dy, p.color);
                }
            });

            step(dt);
            render();
            animationId = requestAnimationFrame(updateFrame);
        }

        function updatePointerMove(pointer: Pointer, posX: number, posY: number) {
            pointer.prevTexcoordX = pointer.texcoordX;
            pointer.prevTexcoordY = pointer.texcoordY;
            pointer.texcoordX = posX / canvas!.width;
            pointer.texcoordY = 1 - posY / canvas!.height;
            pointer.deltaX = pointer.texcoordX - pointer.prevTexcoordX;
            pointer.deltaY = pointer.texcoordY - pointer.prevTexcoordY;
            pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const pointer = pointers[0];
            const posX = scaleByPixelRatio(e.clientX);
            const posY = scaleByPixelRatio(e.clientY);
            updatePointerMove(pointer, posX, posY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            const pointer = pointers[0];
            const touch = e.touches[0];
            if (touch) {
                const posX = scaleByPixelRatio(touch.clientX);
                const posY = scaleByPixelRatio(touch.clientY);
                updatePointerMove(pointer, posX, posY);
            }
        };

        pointers[0].color = generateColor();
        resizeCanvas();
        updateFrame();

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, [SIM_RESOLUTION, DYE_RESOLUTION, DENSITY_DISSIPATION, VELOCITY_DISSIPATION, PRESSURE, CURL, SPLAT_RADIUS, SPLAT_FORCE, SHADING, COLOR_UPDATE_SPEED]);

    return (
        <div className="fixed top-0 left-0 z-50 pointer-events-none w-full h-full">
            <canvas ref={canvasRef} className="w-screen h-screen block"></canvas>
        </div>
    );
};

export default SplashCursor;
