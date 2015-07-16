"use strict";

var canvas;
var gl;

var vs = [];
var shape = "triangle";
var tessellationSubdivisions = 6;
var twistCoefficient = 0.75;
var vertexBufferLength = 0;

// Original Geometry
var geometries = {
    triangle: [
        vec2( -0.5, -0.5 ),
        vec2(  0,  0.5 ),
        vec2(  0.5, -0.5 )
    ],
    
    square: [
        vec2(-0.5, -0.5),
        vec2(-0.5,  0.5),
        vec2( 0.5, -0.5),
        vec2( 0.5, -0.5),
        vec2(-0.5,  0.5),
        vec2( 0.5,  0.5)
    ],
    
    hexagon: [
        vec2(0.0, 0.0),
        vec2(-0.5, 0.0),
        vec2(-0.25, 0.4330127),
        vec2(0.0, 0.0),
        vec2(-0.25, 0.4330127),
        vec2(0.25, 0.4330127),
        vec2(0.0, 0.0),
        vec2(0.25, 0.4330127),
        vec2(0.5, 0.0),
        vec2(0.0, 0.0),
        vec2(-0.25, -0.4330127),
        vec2(-0.5, 0.0),
        vec2(0.0, 0.0),
        vec2(0.25, -0.4330127),
        vec2(-0.25, -0.4330127),
        vec2(0.0, 0.0),
        vec2(0.5, 0.0),
        vec2(0.25, -0.4330127),
    ],
};

// Initialisation Functions
window.onload = function init()
{
    // Acquire Canvas and initialise WebGL
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    // Configure WebGL View Port
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // Compile and Link Shaders
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Acquire Uniform Variables
    vs.twistOrigin = gl.getUniformLocation(program, "twistOrigin");
    vs.twistCoefficient = gl.getUniformLocation(program, "twistCoefficient");
    
    
    // Prepare Vertex Buffer
    var vertexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Render with Initial Values for all parameters
    gl.uniform1f(vs.twistCoefficient, twistCoefficient);
    bufferGeometry();
    render();
    
    // User Interface
    var tessellationSubdivisionsRange = document.getElementById("tessellationSubdivisionsRange");
    tessellationSubdivisionsRange.value = tessellationSubdivisions;
    tessellationSubdivisionsRange.onchange = function(e) {
        if (tessellationSubdivisions != tessellationSubdivisionsRange.value) {
            tessellationSubdivisions = tessellationSubdivisionsRange.value;
            bufferGeometry();
            render();
        }
    };
    
    var twistCoefficientRange = document.getElementById("twistCoefficientRange");
    twistCoefficientRange.value = twistCoefficient;
    twistCoefficientRange.onchange = function(e) {
        twistCoefficient = twistCoefficientRange.value;
        gl.uniform1f(vs.twistCoefficient, twistCoefficient);
        render();
    };
    
    var shapeRadioButtons = document.getElementsByName("shapeRadio");
    for (var i = 0; i < shapeRadioButtons.length; ++i)
    {
        if (shape == shapeRadioButtons[i].value) shapeRadioButtons[i].checked = "checked";
        shapeRadioButtons[i].onclick = function(e) {
            if (shape != e.target.value) {
                shape = e.target.value;
                bufferGeometry();
                render();
            }
        };
    }
};

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, vertexBufferLength);
};

function bufferGeometry()
{
    // Select the Geometry and Twist-Origin according to the shape
    var geometry;
    var twistOrigin;
    switch (shape)
    {
        case "square":
            geometry = geometries.square;
            twistOrigin = [0.0, 0.0];
            break;
            
        case "hexagon":
            geometry = geometries.hexagon;
            twistOrigin = [0.0, 0.0];
            break;
        
        default:
            geometry = geometries.triangle;
            twistOrigin = circumcentre(geometries.triangle);
            break;
    };
    
    // Send the Twist-Origin to the GPU
    gl.uniform2f(vs.twistOrigin, twistOrigin[0], twistOrigin[1]);
    
    // Send the Geometry to the GPU
    var points = tessellate(geometry, tessellationSubdivisions);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    vertexBufferLength = points.length;
};

// Tessellates an Array of Triangles
function tessellate(triangles, iterations)
{
    if ((!triangles) || (triangles.constructor !== Array) || ((triangles.length % 3) !== 0))
    {
        throw "`triangles' must be an array with length divisible by 3";
    }
    else if (iterations <= 0) return triangles;
    
    var output = new Array(4 * triangles.length);
    for (var i = 0; i < triangles.length; i += 3)
    {
        var ab = mix(triangles[i], triangles[i + 1], 0.5);
        var ac = mix(triangles[i], triangles[i + 2], 0.5);
        var bc = mix(triangles[i + 1], triangles[i + 2], 0.5);
        
        var j = (i / 3) * 12;
        output[j + 0] = triangles[i];
        output[j + 1] = ab;
        output[j + 2] = ac;
        
        output[j + 3] = triangles[i + 2];
        output[j + 4] = ac;
        output[j + 5] = bc;
        
        output[j + 6] = triangles[i + 1];
        output[j + 7] = bc;
        output[j + 8] = ab;
        
        output[j + 9] = ac;
        output[j + 10] = ab;
        output[j + 11] = bc;
    }
    
    return (iterations == 1)? output : tessellate(output, iterations - 1);
}

// Calculates the Circumcentre of a Triangle
function circumcentre(triangle)
{
    var ax = triangle[0][0];
    var ay = triangle[0][1];
    var bx = triangle[1][0];
    var by = triangle[1][1];
    var cx = triangle[2][0];
    var cy = triangle[2][1];

    var d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    return [
        ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy *cy) * (ay - by)) / d,
        ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy *cy) * (bx - ax)) / d,
    ];
}
