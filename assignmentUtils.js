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

    // Initialises a Texture Object
    initialiseTexture: function (width, height, bitmap)
    {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        return texture;
    },

    // Initialises a Texture Object from a HTML DOM IMAGE
    initialiseTextureDOM: function (image)
    {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        return texture;
    },

    // Bind a Texture to a Texture-Unit and Shader Uniform Variable
    bindTexture: function(textureUnit, texture, uniformIndex)
    {
        var textureUnitIndex = -1;
        switch (textureUnit)
        {
            case gl.TEXTURE0: textureUnitIndex = 0; break;
            case gl.TEXTURE1: textureUnitIndex = 1; break;
            case gl.TEXTURE2: textureUnitIndex = 2; break;
            case gl.TEXTURE3: textureUnitIndex = 3; break;
            case gl.TEXTURE4: textureUnitIndex = 4; break;
            case gl.TEXTURE5: textureUnitIndex = 5; break;
            case gl.TEXTURE6: textureUnitIndex = 6; break;
            case gl.TEXTURE7: textureUnitIndex = 7; break;
            case gl.TEXTURE8: textureUnitIndex = 8; break;
            case gl.TEXTURE9: textureUnitIndex = 9; break;
            case gl.TEXTURE10: textureUnitIndex = 10; break;
            case gl.TEXTURE11: textureUnitIndex = 11; break;
            case gl.TEXTURE12: textureUnitIndex = 12; break;
            case gl.TEXTURE13: textureUnitIndex = 13; break;
            case gl.TEXTURE14: textureUnitIndex = 14; break;
            case gl.TEXTURE15: textureUnitIndex = 15; break;
            case gl.TEXTURE16: textureUnitIndex = 16; break;
            case gl.TEXTURE17: textureUnitIndex = 17; break;
            case gl.TEXTURE18: textureUnitIndex = 18; break;
            case gl.TEXTURE19: textureUnitIndex = 19; break;
            case gl.TEXTURE20: textureUnitIndex = 20; break;
            case gl.TEXTURE21: textureUnitIndex = 21; break;
            case gl.TEXTURE22: textureUnitIndex = 22; break;
            case gl.TEXTURE23: textureUnitIndex = 23; break;
            case gl.TEXTURE24: textureUnitIndex = 24; break;
            case gl.TEXTURE25: textureUnitIndex = 25; break;
            case gl.TEXTURE26: textureUnitIndex = 26; break;
            case gl.TEXTURE27: textureUnitIndex = 27; break;
            case gl.TEXTURE28: textureUnitIndex = 28; break;
            case gl.TEXTURE29: textureUnitIndex = 29; break;
            case gl.TEXTURE30: textureUnitIndex = 30; break;
            case gl.TEXTURE31: textureUnitIndex = 31; break;
            default: throw "Texture Unit is not a valid WebGL Texture Unit";
        }

        gl.activeTexture(textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uniformIndex, textureUnitIndex);
    },
};
