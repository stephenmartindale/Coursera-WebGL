"use strict";

var canvas;
var gl;

var geometry = [];
var points = [];
var normals = [];
var geometryChanged = false;

var vertexBufferId = null;
var normalBufferId = null;

var checkerBoard = null;
var checkerBoardColoured = null;
var marsTexture = null;
var activeTexture = null;
var activeTextureChanged = false;

var modelViewParameters = {
    eye: vec4(0.0, 0.0, 6.0, 1.0),
    at: vec4(0.0, 0.0, 0.0, 1.0),
};

var projectionParameters = {
    fieldOfView: 45.0,
    perspectiveNear: 0.3,
    perspectiveFar: 20.0,
};

var projectionMatrix;

var blinnSpecular = true;
var wireframe = false;
var textureMappingMode = 0;
var lightScene = true;
var light1Enabled = true;
var light2Enabled = true;

var activeProgram = null;

$(function()
{
    // Acquire Canvas and initialise WebGL
    canvas = $("#gl-canvas")[0];
    gl = WebGLUtils.setupWebGL(canvas);
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Configure WebGL View Port
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable depth testing and polygon offset so that lines will be in front of filled triangles
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    // Create Buffers
    vertexBufferId = gl.createBuffer();
    normalBufferId = gl.createBuffer();

    // Initialise Textures
    var textureImage = new textures.checkerBoard(false);
    checkerBoard = assignmentUtils.initialiseTexture(textureImage.width, textureImage.height, textureImage.bitmap);

    textureImage = new textures.checkerBoard(true);
    checkerBoardColoured = assignmentUtils.initialiseTexture(textureImage.width, textureImage.height, textureImage.bitmap);

    textureImage = document.getElementById("marsTexture");
    marsTexture = assignmentUtils.initialiseTextureDOM(textureImage);

    // Calculate Projection Matrix
    var aspectRatio = canvas.width / canvas.height;
    projectionMatrix = perspective(projectionParameters.fieldOfView, aspectRatio, projectionParameters.perspectiveNear, projectionParameters.perspectiveFar);

    // Prepare Program
    activeProgram = new assignmentProgram(gl, ["vs-fragment-lighting"], ["fs-fragment-lighting"]);
    gl.useProgram(activeProgram.program);

    // Enable Vertex and Normal and Texture Coordinate Buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.vertexAttribPointer(activeProgram.vs.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(activeProgram.vs.vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferId);
    gl.vertexAttribPointer(activeProgram.vs.vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(activeProgram.vs.vNormal);

    // Refresh Uniform Variables
    gl.uniform4fv(activeProgram.vs.viewEye, flatten(modelViewParameters.eye));
    gl.uniform4fv(activeProgram.vs.viewAt, flatten(modelViewParameters.at));
    gl.uniformMatrix4fv(activeProgram.vs.projectionMatrix, false, flatten(projectionMatrix));

    // Material Properties
    gl.uniform4fv(activeProgram.vs.materialAmbient, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
    gl.uniform4fv(activeProgram.vs.materialDiffuse, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
    gl.uniform4fv(activeProgram.vs.materialSpecular, flatten(vec4(0.4, 0.4, 0.4, 1.0)));
    gl.uniform1f(activeProgram.vs.materialShininess, 20.0);

    // Set Active Texture
    activeTexture = checkerBoard;
    activeTextureChanged = true;

    // Render
    render();

    // Attach User-Interface Events
    $("#textureSelection input:radio[name='textureRadio']").click(textureChanged);
    $("#textureSelection input:radio[name='textureMappingMode']").click(textureMappingModeChanged);

    $("#lightingOptions input:radio[name='specularRadio']").click(specularModeChanged);
    $("#lightingOptions input:checkbox").click(lightToggled);

    $("#scaleRange").slider({ min: 0.1, max: 10.0, step: 0.01, value: 3.6, slide: meshManipulationParameterChanged });

    $("#rotationXRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#rotationYRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#rotationZRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });

    $("#userControls input:checkbox[name='lightSceneCheck']").click(lightSceneCheckToggled);
    $("#userControls input:checkbox[name='wireframeCheck']").click(wireframeToggled);

    // Generate Sphere Geometry
    pushGeometry(new meshes.sphere());
});

function assignmentProgram(gl, vertexShaders, fragmentShaders)
{
    // Compile and Link Shaders
    this.program = assignmentUtils.initialiseProgram(gl, vertexShaders, fragmentShaders);

    // Acquire Shader Variables
    this.vs = {
        vPosition: gl.getAttribLocation(this.program, "vPosition"),
        vNormal: gl.getAttribLocation(this.program, "vNormal"),

        viewEye: gl.getUniformLocation(this.program, "viewEye"),
        viewAt: gl.getUniformLocation(this.program, "viewAt"),
        projectionMatrix: gl.getUniformLocation(this.program, "projectionMatrix"),

        instanceScale: gl.getUniformLocation(this.program, "instanceScale"),
        instanceRotation: gl.getUniformLocation(this.program, "instanceRotation"),
        instanceDisplacement: gl.getUniformLocation(this.program, "instanceDisplacement"),

        blinnSpecular: gl.getUniformLocation(this.program, "blinnSpecular"),
        wireframe: gl.getUniformLocation(this.program, "wireframe"),
        textureMappingMode: gl.getUniformLocation(this.program, "textureMappingMode"),
        lightScene: gl.getUniformLocation(this.program, "lightScene"),

        lightPosition1: gl.getUniformLocation(this.program, "lightPosition1"),
        lightAmbient1: gl.getUniformLocation(this.program, "lightAmbient1"),
        lightDiffuse1: gl.getUniformLocation(this.program, "lightDiffuse1"),
        lightSpecular1: gl.getUniformLocation(this.program, "lightSpecular1"),
        lightAttenuation1: gl.getUniformLocation(this.program, "lightAttenuation1"),

        lightPosition2: gl.getUniformLocation(this.program, "lightPosition2"),
        lightAmbient2: gl.getUniformLocation(this.program, "lightAmbient2"),
        lightDiffuse2: gl.getUniformLocation(this.program, "lightDiffuse2"),
        lightSpecular2: gl.getUniformLocation(this.program, "lightSpecular2"),
        lightAttenuation2: gl.getUniformLocation(this.program, "lightAttenuation2"),

        materialAmbient: gl.getUniformLocation(this.program, "materialAmbient"),
        materialDiffuse: gl.getUniformLocation(this.program, "materialDiffuse"),
        materialSpecular: gl.getUniformLocation(this.program, "materialSpecular"),
        materialShininess: gl.getUniformLocation(this.program, "materialShininess"),

        texture0: gl.getUniformLocation(this.program, "texture0"),
    };
}

function render()
{
    // Limit F.P.S. to approximately 30 to save CPU cycles
    setTimeout(function() {
        requestAnimFrame(render);

        if (geometryChanged)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferId);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

            geometryChanged = false;
        }

        if (activeTextureChanged)
        {
            assignmentUtils.bindTexture(gl.TEXTURE0, activeTexture, activeProgram.vs.texture0);
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Light Sources 1: Static Directional & Ambient Light
        gl.uniform4fv(activeProgram.vs.lightPosition1, flatten(vec4(1.0, 1.0, 0.6, 0.0)));
        gl.uniform3fv(activeProgram.vs.lightAttenuation1, flatten(vec3(0.1, 0.01, 0.02)));

        if (light1Enabled)
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient1, flatten(vec4(0.1, 0.1, 0.1, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse1, flatten(vec4(0.4, 0.4, 0.4, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular1, flatten(vec4(0.6, 0.6, 0.6, 1.0)));
        }
        else
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient1, flatten(vec4(0.05, 0.05, 0.05, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse1, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular1, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
        }

        // Light Sources 2: Orbital Point Light
        var t = Date.now();
        var lightRadius2 = 10.0;
        var lightTheta2 = (((t / 24000.0) * (2.0 * Math.PI)) % 2.0 * Math.PI);
        var lightPhi2 = Math.PI / -4.0;
        var lightPosition2 = vec4(lightRadius2 * Math.cos(lightTheta2) * Math.cos(lightPhi2),
                                  lightRadius2 * Math.cos(lightTheta2) * Math.sin(lightPhi2),
                                  lightRadius2 * Math.sin(lightTheta2),
                                  1.0);

        gl.uniform4fv(activeProgram.vs.lightPosition2, flatten(lightPosition2));
        gl.uniform3fv(activeProgram.vs.lightAttenuation2, flatten(vec3(0.1, 0.01, 0.02)));

        if (light2Enabled)
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse2, flatten(vec4(1.0, 0.8392, 0.667, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular2, flatten(vec4(1.0, 0.8392, 0.667, 1.0)));
        }
        else
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
        }

        gl.uniform1i(activeProgram.vs.blinnSpecular, (blinnSpecular)? 1 : 0);
        gl.uniform1i(activeProgram.vs.textureMappingMode, textureMappingMode);
        gl.uniform1i(activeProgram.vs.lightScene, (lightScene)? 1 : 0);

        for (var i = 0; i < geometry.length; ++i)
        {
            gl.uniform1f(activeProgram.vs.instanceScale, geometry[i].scale);
            gl.uniform3fv(activeProgram.vs.instanceRotation, flatten(geometry[i].rotation));
            gl.uniform3fv(activeProgram.vs.instanceDisplacement, flatten(geometry[i].displacement));

            gl.uniform1i(activeProgram.vs.wireframe, 0);
            geometry[i].draw();

            if (wireframe)
            {
                gl.uniform1i(activeProgram.vs.wireframe, 1);
                geometry[i].drawWireframe();
            }
        }
    }, 33);
}

function pushGeometry(geometryObject)
{
    geometry.push(geometryObject);
    geometryObject.generateVertices(points, normals);
    geometryChanged = true;

    $("#scaleRange").slider("option", "value", geometryObject.scale);

    $("#rotationXRange").slider("option", "value", geometryObject.rotation[0]);
    $("#rotationYRange").slider("option", "value", geometryObject.rotation[1]);
    $("#rotationZRange").slider("option", "value", geometryObject.rotation[2]);

    $('#meshManipulation').show();
}

function textureChanged(e)
{
    switch ($("#textureSelection input:radio[name='textureRadio']:checked").val())
    {
        case "checkerBoard": activeTexture = checkerBoard; activeTextureChanged = true; break;
        case "checkerBoardColoured": activeTexture = checkerBoardColoured; activeTextureChanged = true; break;
        case "mars": activeTexture = marsTexture; activeTextureChanged = true; break;
    }
}

function textureMappingModeChanged(e)
{
    switch ($("#textureSelection input:radio[name='textureMappingMode']:checked").val())
    {
        case "cylindrical": textureMappingMode = 2; break;
        case "planar": textureMappingMode = 1; break;
        default: textureMappingMode = 0; break;
    }
}

function specularModeChanged(e)
{
    blinnSpecular = ($("#lightingOptions input:radio[name='specularRadio']:checked").val() == "blinn");
}

function lightToggled(e)
{
    switch (e.target.name)
    {
        case "light1Check": light1Enabled = !light1Enabled; break;
        case "light2Check": light2Enabled = !light2Enabled; break;
    }
}

function lightSceneCheckToggled(e)
{
    lightScene = e.target.checked;
}

function wireframeToggled(e)
{
    wireframe = e.target.checked;
}

function meshManipulationParameterChanged(e, ui)
{
    var g = geometry[geometry.length - 1];

    g.scale = $("#scaleRange").slider("option", "value");

    g.rotation[0] = $("#rotationXRange").slider("option", "value");
    g.rotation[1] = $("#rotationYRange").slider("option", "value");
    g.rotation[2] = $("#rotationZRange").slider("option", "value");
}

var meshes =
{
    sphere: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;
        var lineIndex = undefined;
        var lineCount = undefined;

        this.scale = 3.6;
        this.rotation = vec3(Math.PI / 2.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        var generateIcosahedron = function(pointArray)
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

        var correctWrapping = function(reference, point, dimension, threshold, range)
        {
            while ((reference[dimension] > point[dimension]) && ((reference[dimension] - point[dimension]) > threshold))
            {
                point[dimension] += range;
            }

            while ((reference[dimension] < point[dimension]) && ((point[dimension] - reference[dimension]) > threshold))
            {
                point[dimension] -= range;
            }
        }

        this.generateVertices = function(pointArray, normalArray)
        {
            const r = 0.5;
            var data = [];
            generateIcosahedron(data);
            data = assignmentUtils.tessellate(data, 4);

            vertexIndex = pointArray.length;

            var minX = Infinity;
            var minY = Infinity;
            var minZ = Infinity;
            var maxX = -Infinity;
            var maxY = -Infinity;
            var maxZ = -Infinity;

            for (var i = 0; i < data.length; ++i)
            {
                var l = Math.sqrt(data[i][0] * data[i][0]
                                + data[i][1] * data[i][1]
                                + data[i][2] * data[i][2]);

                data[i][3] = l / r;

                pointArray.push(data[i]);
                normalArray.push(data[i]);
            }

            vertexCount = pointArray.length - vertexIndex;
            lineIndex = pointArray.length;

            var replicatePoint = function(m)
            {
                pointArray.push(pointArray[m]);
                normalArray.push(normalArray[m]);
            }

            // Emit Additional Vertices for Wire-Frame
            for (var k = 0; k < vertexCount; ++k)
            {
                replicatePoint(vertexIndex + k);

                if ((k % 3) < 2) replicatePoint(vertexIndex + k + 1);
                else replicatePoint(vertexIndex + k - 2);
            }

            lineCount = pointArray.length - lineIndex;
        }

        this.draw = function()
        {
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);
        }

        this.drawWireframe = function()
        {
            gl.drawArrays(gl.LINES, lineIndex, lineCount);
        }
    }
};

var textures =
{
    checkerBoard: function(colour)
    {
        this.width = 256;
        this.height = 256;

        this.bitmap = new Uint8Array(4 * this.width * this.height);

        for (var t = 0; t < this.height; t++)
        {
            for (var s = 0; s < this.width; s++)
            {
                var r = 0x00, g = 0x00, b = 0x00;
                if (((t & 0x10) == 0) ^ ((s & 0x10) == 0))
                {
                    if (colour)
                    {
                        r = (t < (this.height / 2))? 0xff : 0x00;
                        g = (s < (this.width / 2))? 0xff : 0x00;
                        b = ((r == 0x00) && (g == 0x00))? 0xff : 0x00;
                    }
                    else r = g = b = 0xff;
                }

                this.bitmap[(4 * this.width * t) + (4 * s) + 0] = r;
                this.bitmap[(4 * this.width * t) + (4 * s) + 1] = g;
                this.bitmap[(4 * this.width * t) + (4 * s) + 2] = b;
                this.bitmap[(4 * this.width * t) + (4 * s) + 3] = 0xff;
            }
        }
    }
};
