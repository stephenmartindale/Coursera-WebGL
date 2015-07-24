"use strict";

var canvas;
var gl;
var vs = [];
var bufferId;

var bufferLength = 1024;
var points = [];
var lines = [];

$(function()
{
    // Acquire Canvas and initialise WebGL
    canvas = $("#gl-canvas")[0];
    gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Configure WebGL View Port
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // Compile and Link Shaders
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    // Acquire Shader Variables
    vs.lineColour = gl.getUniformLocation(program, "lineColour");
    vs.vPosition = gl.getAttribLocation(program, "vPosition");

    // Prepare Vertex Buffer
    bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, bufferLength, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vs.vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vs.vPosition);

    // Render with Initial Values for all parameters
    render();

    // Attach to Mouse Events
    $("#gl-canvas").on("mousedown", canvasOnMouseDown);
});

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (var i = 0; i < lines.length; ++i)
    {
        gl.uniform4f(vs.lineColour, lines[i].colour[0], lines[i].colour[1], lines[i].colour[2], lines[i].colour[3]);
        gl.drawArrays(gl.LINE_STRIP, lines[i].index, lines[i].length);
    }
};

function pushPoint(v)
{
    points.push(v);

    if (8 * points.length > bufferLength)
    {
        var oldBufferId = bufferId;
        var newBufferLength = bufferLength + 1024;
        var newBufferId = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, newBufferId);
        gl.bufferData(gl.ARRAY_BUFFER, newBufferLength, gl.STATIC_DRAW);
        gl.vertexAttribPointer(vs.vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vs.vPosition);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));

        bufferId = newBufferId;
        bufferLength = newBufferLength;

        console.log('Vertex Buffer Resized')
    }
    else
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
        gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (points.length - 1), flatten(v));
    }
};

function pushClientPoint(clientX, clientY)
{
    pushPoint(vec2(((2 * clientX) / canvas.width) - 1, ((2 * (canvas.height - clientY)) / canvas.height) - 1));
};

function canvasOnMouseDown(e)
{
    pushClientPoint(e.offsetX, e.offsetY);

    var r = $("#redRange").val();
    var g = $("#greenRange").val();
    var b = $("#blueRange").val();

    lines.push({
        colour: vec4(r / 255.0, g / 255.0, b / 255.0, 1.0),
        index: points.length - 1,
        length: 1,
    });

    $("#gl-canvas").unbind("mousedown");
    $("#gl-canvas").on("mousemove", canvasOnMouseMove);
    $("#gl-canvas").on("mouseup", canvasOnMouseUp);

    requestAnimFrame(render);
};

function canvasOnMouseMove(e)
{
    pushClientPoint(e.offsetX, e.offsetY);
    lines[lines.length - 1].length ++;

    requestAnimFrame(render);
};

function canvasOnMouseUp(e)
{
    $("#gl-canvas").unbind("mouseup");
    $("#gl-canvas").unbind("mousemove");
    $("#gl-canvas").on("mousedown", canvasOnMouseDown);
};
