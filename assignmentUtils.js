var assignmentUtils = {

    // Compiles GLSL Shaders
    compileShaders: function (gl, shaders, shaderType)
    {
        var shaderText = null;
        if ($.isArray(shaders))
        {
            for (var i = 0; i < shaders.length; ++i)
            {
                var element = document.getElementById(shaders[i]);
                if (!element) throw "Failed to find Shader Element: '" + shaders[i] + "'";
                else shaderText = (shaderText)? (shaderText + element.text) : element.text;
            }
        }
        else if (typeof(shaders) === "string")
        {
            var element = document.getElementById(shaders);
            if (!element) throw "Failed to find Shader Element: '" + shaders + "'";
            else shaderText = element.text;
        }

        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderText);
        gl.compileShader(shader);
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
        else throw gl.getShaderInfoLog(shader);
    },

    // Initialises a GLSL program
    initialiseProgram: function (gl, vertexShaders, fragmentShaders)
    {
        var program = gl.createProgram();

        gl.attachShader(program, assignmentUtils.compileShaders(gl, vertexShaders, gl.VERTEX_SHADER));
        gl.attachShader(program, assignmentUtils.compileShaders(gl, fragmentShaders, gl.FRAGMENT_SHADER));

        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
        else throw gl.getProgramInfoLog(program);
    },

    // Tessellates an Array of Triangles
    tessellate: function (triangles, iterations)
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

        return (iterations == 1)? output : assignmentUtils.tessellate(output, iterations - 1);
    },

};
