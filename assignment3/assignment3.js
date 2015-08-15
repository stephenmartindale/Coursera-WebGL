"use strict";

var canvas;
var gl;
var vs = [];

var geometry = [];
var points = [];
var pointsChanged = false;
var vertexBufferId;

var modelViewParameters = {
    eye: vec3(0.0, 0.0, 6.0),
    at: vec3(0.0, 0.0, 0.0),
    up: vec3(0.0, 1.0, 0.0),
};

var projectionParameters = {
    left: -2,
    right: 2,
    bottom: -2,
    top: 2,
    near: -20,
    far: 20,
    fieldOfView: 45.0,
    perspectiveNear: 0.3,
    perspectiveFar: 20.0,
};

var modelViewMatrix;
var projectionMatrix;

$(function()
{
    // Acquire Canvas and initialise WebGL
    canvas = $("#gl-canvas")[0];
    gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Configure WebGL View Port
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // Enable depth testing and polygon offset so that lines will be in front of filled triangles
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    // Compile and Link Shaders
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    // Acquire Shader Variables
    vs.vPosition = gl.getAttribLocation(program, "vPosition");
    vs.modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    vs.projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
    vs.instanceScale = gl.getUniformLocation(program, "instanceScale");
    vs.instanceRotation = gl.getUniformLocation(program, "instanceRotation");
    vs.instanceDisplacement = gl.getUniformLocation(program, "instanceDisplacement");
    vs.fColor = gl.getUniformLocation(program, "fColor");

    // Prepare Vertex Buffer
    vertexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.vertexAttribPointer(vs.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vs.vPosition);

    // Calculate Projection Matrices
    modelViewMatrix = lookAt(modelViewParameters.eye, modelViewParameters.at, modelViewParameters.up);
    projectionMatrix = ortho(projectionParameters.left, projectionParameters.right, projectionParameters.bottom, projectionParameters.top, projectionParameters.near, projectionParameters.far);

    gl.uniformMatrix4fv(vs.modelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(vs.projectionMatrix, false, flatten(projectionMatrix));

    // Render
    render();

    // Attach User-Interface Events
    $("#cameraControls input:radio[name='projectionRadio']").click(projectionModeChanged);

    $("#redRange").slider({ min: 0.0, max: 1.0, step: 0.00390625, value: 1.0, slide: meshManipulationParameterChanged });
    $("#greenRange").slider({ min: 0.0, max: 1.0, step: 0.00390625, value: 1.0, slide: meshManipulationParameterChanged });
    $("#blueRange").slider({ min: 0.0, max: 1.0, step: 0.00390625, value: 1.0, slide: meshManipulationParameterChanged });

    $("#scaleRange").slider({ min: 0.1, max: 10.0, step: 0.01, value: 1.0, slide: meshManipulationParameterChanged });

    $("#rotationXRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#rotationYRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#rotationZRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });

    $("#displacementXRange").slider({ min: -10.0, max: 10.0, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#displacementYRange").slider({ min: -10.0, max: 10.0, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#displacementZRange").slider({ min: -10.0, max: 10.0, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });

    $('#addSphereButton').click(function(e) { pushGeometry(new meshes.sphere()); });
    $('#addIcosahedronButton').click(function(e) { pushGeometry(new meshes.icosahedron()); });
    $('#addCylinderButton').click(function(e) { pushGeometry(new meshes.cylinder()); });
    $('#addConeButton').click(function(e) { pushGeometry(new meshes.cone()); });
    $('#addRadialHatButton').click(function(e) { pushGeometry(new meshes.radialHat()); });
});

function render()
{
    // Limit F.P.S. to approximately 30 to save CPU cycles
    setTimeout(function() {
        requestAnimFrame(render);

        if (pointsChanged)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
            pointsChanged = false;
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (var i = 0; i < geometry.length; ++i)
        {
            gl.uniform1f(vs.instanceScale, geometry[i].scale);
            gl.uniform3fv(vs.instanceRotation, flatten(geometry[i].rotation));
            gl.uniform3fv(vs.instanceDisplacement, flatten(geometry[i].displacement));

            geometry[i].draw();
        }
    }, 33);
}

function pushGeometry(geometryObject)
{
    geometry.push(geometryObject);
    geometryObject.generateVertices(points);
    pointsChanged = true;

    $("#redRange").slider("option", "value", geometryObject.fillColour[0]);
    $("#greenRange").slider("option", "value", geometryObject.fillColour[1]);
    $("#blueRange").slider("option", "value", geometryObject.fillColour[2]);

    $("#scaleRange").slider("option", "value", geometryObject.scale);

    $("#rotationXRange").slider("option", "value", geometryObject.rotation[0]);
    $("#rotationYRange").slider("option", "value", geometryObject.rotation[1]);
    $("#rotationZRange").slider("option", "value", geometryObject.rotation[2]);

    $("#displacementXRange").slider("option", "value", geometryObject.displacement[0]);
    $("#displacementYRange").slider("option", "value", geometryObject.displacement[1]);
    $("#displacementZRange").slider("option", "value", geometryObject.displacement[2]);

    $('#meshManipulation').show();
}

function projectionModeChanged(e)
{
    if ($("#cameraControls input:radio[name='projectionRadio']:checked").val() != "perspective")
    {
        projectionMatrix = ortho(projectionParameters.left, projectionParameters.right, projectionParameters.bottom, projectionParameters.top, projectionParameters.near, projectionParameters.far);
    }
    else
    {
        canvas = $("#gl-canvas")[0];
        var aspectRatio = canvas.width / canvas.height;
        projectionMatrix = perspective(projectionParameters.fieldOfView, aspectRatio, projectionParameters.perspectiveNear, projectionParameters.perspectiveFar);
    }

    gl.uniformMatrix4fv(vs.projectionMatrix, false, flatten(projectionMatrix));
}

function meshManipulationParameterChanged(e, ui)
{
    var g = geometry[geometry.length - 1];

    g.fillColour[0] = $("#redRange").slider("option", "value");
    g.fillColour[1] = $("#greenRange").slider("option", "value");
    g.fillColour[2] = $("#blueRange").slider("option", "value");

    g.scale = $("#scaleRange").slider("option", "value");

    g.rotation[0] = $("#rotationXRange").slider("option", "value");
    g.rotation[1] = $("#rotationYRange").slider("option", "value");
    g.rotation[2] = $("#rotationZRange").slider("option", "value");

    g.displacement[0] = $("#displacementXRange").slider("option", "value");
    g.displacement[1] = $("#displacementYRange").slider("option", "value");
    g.displacement[2] = $("#displacementZRange").slider("option", "value");
}

var meshes =
{
    cylinder: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;
        var lineVertexCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(0.0, 1.0, 0.7, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray)
        {
            vertexIndex = pointArray.length;

            var emitVertex = function(y, theta)
            {
                var v = vec4(0.5 * Math.cos(theta),
                             y,
                             0.5 * Math.sin(theta),
                             1.0);

                pointArray.push(v);
            };

            const sectors = 20;
            const layers = 8;
            const sectorAngle = (2.0 * Math.PI) / sectors;
            const layerHeight = 1.0 / layers;

            for (var l = 0; l < layers; ++l)
            {
                var y0 = -0.5 + (layerHeight * l);
                var y1 = -0.5 + (layerHeight * (l + 1));
                var theta0 = (l % 2 == 0)? 0.0 : sectorAngle / 2.0;

                for (var s = 0; s < sectors; ++s)
                {
                    emitVertex(y0, theta0 + (s * sectorAngle));
                    emitVertex(y0, theta0 + ((s + 1.0) * sectorAngle));
                    emitVertex(y1, theta0 + ((s + 0.5) * sectorAngle));

                    emitVertex(y1, theta0 + ((s + 0.5) * sectorAngle));
                    emitVertex(y0, theta0 + ((s + 1.0) * sectorAngle));
                    emitVertex(y1, theta0 + ((s + 1.5) * sectorAngle));
                }

                // Emit additional vertices to form a line-strip along the top edge of the cylinder
                if (l == (layers - 1))
                {
                    vertexCount = pointArray.length - vertexIndex;

                    for (var s = 0; s < sectors; ++s)
                    {
                        emitVertex(y1, theta0 + ((s + 0.5) * sectorAngle));
                        emitVertex(y1, theta0 + ((s + 1.5) * sectorAngle));
                    }

                    lineVertexCount = pointArray.length - vertexIndex;
                }
            }
        }

        this.draw = function()
        {
            gl.uniform4fv(vs.fColor, flatten(this.fillColour));
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);

            gl.uniform4fv(vs.fColor, flatten(this.strokeColour));
            gl.drawArrays(gl.LINE_STRIP, vertexIndex, lineVertexCount);
        }
    },

    cone: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;
        var lineVertexCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(0.0, 0.7, 1.0, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray)
        {
            vertexIndex = pointArray.length;

            var emitVertex = function(y, r, theta)
            {
                var v = vec4(r * Math.cos(theta),
                             y,
                             r * Math.sin(theta),
                             1.0);

                pointArray.push(v);
            };

            const sectors = 20;
            const layers = 8;
            const sectorAngle = (2.0 * Math.PI) / sectors;
            const layerHeight = 1.0 / layers;

            for (var l = 0; l < layers; ++l)
            {
                var y0 = -0.5 + (layerHeight * l);
                var r0 = l * (0.5 / layers);
                var y1 = -0.5 + (layerHeight * (l + 1));
                var r1 = (l + 1) * (0.5 / layers);
                var theta0 = (l % 2 == 0)? 0.0 : sectorAngle / 2.0;

                for (var s = 0; s < sectors; ++s)
                {
                    if (l > 0)
                    {
                        emitVertex(y0, r0, theta0 + (s * sectorAngle));
                        emitVertex(y0, r0, theta0 + ((s + 1.0) * sectorAngle));
                        emitVertex(y1, r1, theta0 + ((s + 0.5) * sectorAngle));
                    }

                    emitVertex(y1, r1, theta0 + ((s + 0.5) * sectorAngle));
                    emitVertex(y0, r0, theta0 + ((s + 1.0) * sectorAngle));
                    emitVertex(y1, r1, theta0 + ((s + 1.5) * sectorAngle));
                }

                // Emit additional vertices to form a line-strip along the top edge of the cylinder
                if (l == (layers - 1))
                {
                    vertexCount = pointArray.length - vertexIndex;

                    for (var s = 0; s < sectors; ++s)
                    {
                        emitVertex(y1, r1, theta0 + ((s + 0.5) * sectorAngle));
                        emitVertex(y1, r1, theta0 + ((s + 1.5) * sectorAngle));
                    }

                    lineVertexCount = pointArray.length - vertexIndex;
                }
            }
        }

        this.draw = function()
        {
            gl.uniform4fv(vs.fColor, flatten(this.fillColour));
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);

            gl.uniform4fv(vs.fColor, flatten(this.strokeColour));
            gl.drawArrays(gl.LINE_STRIP, vertexIndex, lineVertexCount);
        }
    },

    icosahedron: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(1.0, 0.0, 0.0, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray)
        {
            vertexIndex = pointArray.length;

            const r = 0.5;

            var south = vec4(0.0, -r, 0.0, 1.0);
            var north = vec4(0.0, r, 0.0, 1.0);
            var a = Math.atan(0.5);
            var y = r * Math.sin(a);
            var b = (2 * Math.PI) / 5.0;
            for (var j = 0; j < 5; ++j)
            {
                pointArray.push(vec4(r * Math.cos(b * j), -y, r * Math.sin(b * j), 1.0));
                pointArray.push(south);
                pointArray.push(vec4(r * Math.cos(b * (j + 1.0)), -y, r * Math.sin(b * (j + 1.0)), 1.0));

                pointArray.push(vec4(r * Math.cos(b * (j + 0.5)), y, r * Math.sin(b * (j + 0.5)), 1.0));
                pointArray.push(vec4(r * Math.cos(b * j), -y, r * Math.sin(b * j), 1.0));
                pointArray.push(vec4(r * Math.cos(b * (j + 1.0)), -y, r * Math.sin(b * (j + 1.0)), 1.0));

                pointArray.push(vec4(r * Math.cos(b * (j + 1.5)), y, r * Math.sin(b * (j + 1.5)), 1.0));
                pointArray.push(vec4(r * Math.cos(b * (j + 0.5)), y, r * Math.sin(b * (j + 0.5)), 1.0));
                pointArray.push(vec4(r * Math.cos(b * (j + 1.0)), -y, r * Math.sin(b * (j + 1.0)), 1.0));

                pointArray.push(vec4(r * Math.cos(b * (j + 1.5)), y, r * Math.sin(b * (j + 1.5)), 1.0));
                pointArray.push(north);
                pointArray.push(vec4(r * Math.cos(b * (j + 0.5)), y, r * Math.sin(b * (j + 0.5)), 1.0));
            }

            vertexCount = pointArray.length - vertexIndex;
        }

        this.draw = function()
        {
            gl.uniform4fv(vs.fColor, flatten(this.fillColour));
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);

            gl.uniform4fv(vs.fColor, flatten(this.strokeColour));
            gl.drawArrays(gl.LINE_STRIP, vertexIndex, vertexCount);
        }
    },

    sphere: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;
        var lineIndex = undefined;
        var linesCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(1.0, 0.4, 0.7, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray)
        {
            const r = 0.5;
            var icosahedron = new meshes.icosahedron();
            var data = [];
            icosahedron.generateVertices(data);
            data = tessellate(data, 3);

            vertexIndex = pointArray.length;

            for (var i = 0; i < data.length; ++i)
            {
                var l = Math.sqrt(data[i][0] * data[i][0]
                                + data[i][1] * data[i][1]
                                + data[i][2] * data[i][2]);

                data[i][3] = l / r;

                pointArray.push(data[i]);
            }

            vertexCount = pointArray.length - vertexIndex;
            lineIndex = pointArray.length;

            // Emit Additional Vertices for Wire-Frame
            for (var k = 0; k < vertexCount; ++k)
            {
                pointArray.push(pointArray[vertexIndex + k]);

                if ((k % 3) < 2) pointArray.push(pointArray[vertexIndex + k + 1]);
                else pointArray.push(pointArray[vertexIndex + k - 2]);
            }

            linesCount = pointArray.length - lineIndex;
        }

        this.draw = function()
        {
            gl.uniform4fv(vs.fColor, flatten(this.fillColour));
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);

            gl.uniform4fv(vs.fColor, flatten(this.strokeColour));
            gl.drawArrays(gl.LINES, lineIndex, linesCount);
        }
    },

    radialHat: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(1.0, 0.7, 0.7, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray)
        {
            vertexIndex = pointArray.length;

            var nRows = 35;
            var nColumns = 35;
            var data = [];
            for( var i = 0; i < nRows; ++i )
            {
                data.push( [] );
                var x = Math.PI*(4*i/nRows-2.0);

                for( var j = 0; j < nColumns; ++j )
                {
                    var y = Math.PI*(4*j/nRows-2.0);
                    var r = Math.sqrt(x*x+y*y);
                    data[i][j] = r ? Math.sin(r) / r : 1.0;
                }
            }

            for(var i=0; i<nRows-1; i++)
            {
                for(var j=0; j<nColumns-1;j++)
                {
                    pointArray.push( vec4(2*i/nRows-1, data[i][j], 2*j/nColumns-1, 1.0));
                    pointArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j], 2*j/nColumns-1, 1.0));
                    pointArray.push( vec4(2*(i+1)/nRows-1, data[i+1][j+1], 2*(j+1)/nColumns-1, 1.0));
                    pointArray.push( vec4(2*i/nRows-1, data[i][j+1], 2*(j+1)/nColumns-1, 1.0) );
                }
            }

            vertexCount = pointArray.length - vertexIndex;
        }

        this.draw = function()
        {
            for(var i = vertexIndex; i < vertexIndex + vertexCount; i += 4 ) {
                gl.uniform4fv(vs.fColor, flatten(this.fillColour));
                gl.drawArrays(gl.TRIANGLE_FAN, i, 4 );

                gl.uniform4fv(vs.fColor, flatten(this.strokeColour));
                gl.drawArrays(gl.LINE_LOOP, i, 4 );
            }
        }
    }
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
