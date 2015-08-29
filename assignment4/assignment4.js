"use strict";

// TODO: Normalise the normal vectors inside the vertex/fragment shaders!
// TODO: Update geometry generation for Cone
// TODO: Update geometry generation for Cylinder
// TODO: Update geometry generation for Icosahedron
// TODO: Simplify Shaders by calculating (light * material) products in Javascript.

var canvas;
var gl;

var geometry = [];
var points = [];
var normals = [];
var geometryChanged = false;

var vertexBufferId;
var normalBufferId;

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
var light1Enabled = true;
var light2Enabled = true;

var programVertexLighting = null;
var programFragmentLighting = null;
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

    // Create Buffers
    vertexBufferId = gl.createBuffer();
    normalBufferId = gl.createBuffer();

    // Calculate Projection Matrix
    var aspectRatio = canvas.width / canvas.height;
    projectionMatrix = perspective(projectionParameters.fieldOfView, aspectRatio, projectionParameters.perspectiveNear, projectionParameters.perspectiveFar);

    // Prepare Programs
    programVertexLighting = new assignmentProgram(gl, ["shader-utils", "vs-vertex-lighting"], ["fs-shared", "shader-utils", "fs-vertex-lighting"]);
    programFragmentLighting = new assignmentProgram(gl, ["shader-utils", "vs-fragment-lighting"], ["fs-shared", "shader-utils", "fs-fragment-lighting"]);

    // Prepare and Use Program
    useProgram(programFragmentLighting);

    // Render
    render();

    // Attach User-Interface Events
    $("#lightingOptions input:radio[name='lightingRadio']").click(lightingModeChanged);
    $("#lightingOptions input:radio[name='specularRadio']").click(specularModeChanged);
    $("#lightingOptions input:checkbox").click(lightToggled);

    $("#scaleRange").slider({ min: 0.1, max: 10.0, step: 0.01, value: 1.0, slide: meshManipulationParameterChanged });

    $("#rotationXRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#rotationYRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#rotationZRange").slider({ min: 0.0, max: 2.0 * Math.PI, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });

    $("#displacementXRange").slider({ min: -10.0, max: 10.0, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#displacementYRange").slider({ min: -10.0, max: 10.0, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });
    $("#displacementZRange").slider({ min: -10.0, max: 10.0, step: 0.01, value: 0.0, slide: meshManipulationParameterChanged });

    $('#addSphereButton').click(function(e) { pushGeometry(new meshes.sphere()); });
    $('#addConeButton').click(function(e) { pushGeometry(new meshes.cone()); });
    $('#addCylinderButton').click(function(e) { pushGeometry(new meshes.cylinder()); });
});

function useProgram(p)
{
    // Change the Active Program
    if (activeProgram == p) return;
    activeProgram = p;
    gl.useProgram(activeProgram.program);

    // Enable Vertex and Normal Bufers
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.vertexAttribPointer(p.vs.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(p.vs.vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferId);
    gl.vertexAttribPointer(p.vs.vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(p.vs.vNormal);

    // Refresh Uniform Variables
    gl.uniform4fv(activeProgram.vs.viewEye, flatten(modelViewParameters.eye));
    gl.uniform4fv(activeProgram.vs.viewAt, flatten(modelViewParameters.at));
    gl.uniformMatrix4fv(activeProgram.vs.projectionMatrix, false, flatten(projectionMatrix));

    // Material Properties
    gl.uniform4fv(p.vs.materialAmbient, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
    gl.uniform4fv(p.vs.materialDiffuse, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
    gl.uniform4fv(p.vs.materialSpecular, flatten(vec4(1.0, 0.6, 0.6, 1.0)));
    gl.uniform1f(p.vs.materialShininess, 20.0);
}

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

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Light Sources (Light is at the Eye Point)
        var t = Date.now();
        var lightRadius1 = 10.0;
        var lightTheta1 = (((t / 4000.0) * (2.0 * Math.PI)) % 2.0 * Math.PI);
        gl.uniform4fv(activeProgram.vs.lightPosition1, flatten(vec4(lightRadius1 * Math.cos(lightTheta1), lightRadius1 * Math.sin(lightTheta1), 2.0, 1.0)));
        gl.uniform3fv(activeProgram.vs.lightAttenuation1, flatten(vec3(0.1, 0.01, 0.02)));

        if (light1Enabled)
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient1, flatten(vec4(0.025, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse1, flatten(vec4(0.4, 0.0, 0.4, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular1, flatten(vec4(1.0, 0.0, 1.0, 1.0)));
        }
        else
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient1, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse1, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular1, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
        }

        var lightRadius2 = 10.0;
        var lightTheta2 = (((t / 6700.0) * (2.0 * Math.PI)) % 2.0 * Math.PI);
        gl.uniform4fv(activeProgram.vs.lightPosition2, flatten(vec4(lightRadius2 * Math.cos(lightTheta2), 0.0, lightRadius2 * Math.sin(lightTheta2), 1.0)));
        gl.uniform3fv(activeProgram.vs.lightAttenuation2, flatten(vec3(0.1, 0.01, 0.02)));

        if (light2Enabled)
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient2, flatten(vec4(0.0, 0.025, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse2, flatten(vec4(0.0, 0.4, 0.4, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular2, flatten(vec4(0.0, 1.0, 1.0, 1.0)));
        }
        else
        {
            gl.uniform4fv(activeProgram.vs.lightAmbient2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightDiffuse2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
            gl.uniform4fv(activeProgram.vs.lightSpecular2, flatten(vec4(0.0, 0.0, 0.0, 1.0)));
        }

        gl.uniform1i(activeProgram.vs.blinnSpecular, (blinnSpecular)? 1 : 0);

        for (var i = 0; i < geometry.length; ++i)
        {
            gl.uniform1f(activeProgram.vs.instanceScale, geometry[i].scale);
            gl.uniform3fv(activeProgram.vs.instanceRotation, flatten(geometry[i].rotation));
            gl.uniform3fv(activeProgram.vs.instanceDisplacement, flatten(geometry[i].displacement));

            geometry[i].draw();
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

    $("#displacementXRange").slider("option", "value", geometryObject.displacement[0]);
    $("#displacementYRange").slider("option", "value", geometryObject.displacement[1]);
    $("#displacementZRange").slider("option", "value", geometryObject.displacement[2]);

    $('#meshManipulation').show();
}

function lightingModeChanged(e)
{
    if ($("#lightingOptions input:radio[name='lightingRadio']:checked").val() != "fragment")
        useProgram(programVertexLighting);
    else
        useProgram(programFragmentLighting);
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

function meshManipulationParameterChanged(e, ui)
{
    var g = geometry[geometry.length - 1];

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

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(0.0, 1.0, 0.7, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray, normalArray)
        {
            vertexIndex = pointArray.length;

            var emitVertex = function(y, theta)
            {
                var v = vec4(0.5 * Math.cos(theta),
                             y,
                             0.5 * Math.sin(theta),
                             1.0);

                pointArray.push(v);
                normalArray.push(vec4(v[0], 0.0, v[2], 0.0));
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
            }

            vertexCount = pointArray.length - vertexIndex;
        }

        this.draw = function()
        {
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);
        }
    },

    cone: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(0.0, 0.7, 1.0, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray, normalArray)
        {
            vertexIndex = pointArray.length;

            var emitVertex = function(y, r, theta)
            {
                var v = vec4(r * Math.cos(theta),
                             y,
                             r * Math.sin(theta),
                             1.0);

                pointArray.push(v);
                normalArray.push(vec4(Math.cos(theta), - Math.sqrt(Math.pow(Math.cos(theta), 2) + Math.pow(Math.sin(theta), 2)), Math.sin(theta), 0.0));
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
            }

            vertexCount = pointArray.length - vertexIndex;
        }

        this.draw = function()
        {
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);
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

        this.generateVertices = function(pointArray, normalArray)
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
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);
        }
    },

    sphere: function()
    {
        var that = this;
        var vertexIndex = undefined;
        var vertexCount = undefined;

        this.strokeColour = vec4(0.0, 0.0, 0.0, 1.0);
        this.fillColour = vec4(1.0, 0.4, 0.7, 1.0);
        this.scale = 1.0;
        this.rotation = vec3(0.0, 0.0, 0.0);
        this.displacement = vec3(0.0, 0.0, 0.0);

        this.generateVertices = function(pointArray, normalArray)
        {
            const r = 0.5;
            var icosahedron = new meshes.icosahedron();
            var data = [];
            icosahedron.generateVertices(data);
            data = assignmentUtils.tessellate(data, 3);

            vertexIndex = pointArray.length;

            for (var i = 0; i < data.length; ++i)
            {
                var l = Math.sqrt(data[i][0] * data[i][0]
                                + data[i][1] * data[i][1]
                                + data[i][2] * data[i][2]);

                data[i][3] = l / r;

                if (i % 3 == 2)
                {
                    emitTriangle(pointArray, normalArray, data[i - 2],  data[i - 1],  data[i - 0], data[i - 2],  data[i - 1],  data[i - 0]);
                }
            }

            vertexCount = pointArray.length - vertexIndex;
        }

        this.draw = function()
        {
            gl.drawArrays(gl.TRIANGLES, vertexIndex, vertexCount);
        }
    }
};

function emitTriangle(pointArray, normalArray, point1, point2, point3, norm1, norm2, norm3)
{
    // Emit the Vertices
    pointArray.push(point1);
    pointArray.push(point2);
    pointArray.push(point3);

    // If true normals were not provided,
    // calculate the normal to the traingle's surface
    if (arguments.length < 8)
    {
        var n = vec4(cross(subtract(point3, point1), subtract(point2, point1)));
        normalArray.push(n);
        normalArray.push(n);
        normalArray.push(n);
    }
    // Otherwise, use the supplied normals
    else
    {
        normalArray.push(norm1);
        normalArray.push(norm2);
        normalArray.push(norm3);
    }
}
