// Author: Dustin Freeman
// Title: GenLang

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float sphereDF(vec3 pt, vec3 centre, float radius) {
    float d = distance(pt, centre) - radius;
    return d;
}

float capsuleDF( vec3 p, vec3 a, vec3 b, float r )
{
    vec3 pa = p - a, ba = b - a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h ) - r;
}

highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

highp float rand(float f)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = f;
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

float gen_letter(float d, vec3 pt, vec3 pos, float index) {
    float stroke = 0.;
    d = min(d, capsuleDF(pt, 
                        vec3(vec2(-0.600,1.0) + pos.xy, pos.z),
                         vec3(vec2(0.920,1.0) + pos.xy, pos.z),
                         0.05 + 0.1*floor(rand(index + stroke) * 2.)
                        ));
    
    stroke += 1.;
    d = min(d, capsuleDF(pt, 
                        vec3(vec2(-0.600,0.5) + pos.xy, pos.z),
                         vec3(vec2(0.920,0.5) + pos.xy, pos.z),
                         0.05 + 0.1*floor(rand(index + stroke) * 2.)
                        ));
    
    stroke += 1.;
    d = min(d, capsuleDF(pt, 
                        vec3(vec2(-0.600,0.) + pos.xy, pos.z),
                         vec3(vec2(0.920,0.) + pos.xy, pos.z),
                         0.05 + 0.1*floor(rand(index + stroke) * 2.)
                        ));
    
    return d;
}

float distanceField(vec3 pt) {
    float text_depth = -8.;// + mod(u_time, 1.);
    
    float ticker = -2.*mod(u_time, 10.) + 4.;
    
    float letter_gap = 2.;
    
    float d = 1000000000000.;
    float letter_index = 0.;
    d = gen_letter(d, pt, vec3(ticker + letter_index, 0., text_depth), letter_index);
    letter_index += letter_gap;
    d = gen_letter(d, pt, vec3(ticker + letter_index, 0, text_depth), letter_index);
    letter_index += letter_gap;
    d = gen_letter(d, pt, vec3(ticker + letter_index, 0, text_depth), letter_index);
    
    // d = min(d, sphereDF(pt,
                        // vec3(vec2(0, 0), text_depth), 0.3));
    
    return d;
}

vec3 calculateNormal(vec3 pt) {
    vec2 eps = vec2(1.0, -1.0) * 0.0005;
    return normalize(eps.xyy * distanceField(pt + eps.xyy) +
                     eps.yyx * distanceField(pt + eps.yyx) +
                     eps.yxy * distanceField(pt + eps.yxy) +
                     eps.xxx * distanceField(pt + eps.xxx));
}

void starry_background(vec2 st) {
	float r = rand(st + vec2(u_time*0.0000003, 0));
    if (r > 0.01) {
        gl_FragColor = vec4(0.,0.,0.,1.);
    } else {
    	gl_FragColor = vec4(1.,1.,1.,1.); 
    }
}

vec3 rotateVec(vec3 inputVec, float amount) {
    inputVec.x = cos(amount)*inputVec.x + sin(amount)*inputVec.y;
    inputVec.y = - sin(amount)*inputVec.x + cos(amount)*inputVec.y;
    
    return inputVec;
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st -= vec2(0.5,0.5);
    st.x *= u_resolution.x/u_resolution.y;

    starry_background(st);
    
    //raycast:
    vec3 rayOrigin = vec3 (0.,0.,1.);
    vec3 rayDirection = normalize(vec3(st, 0.) - rayOrigin);
    
    float distance;
    float photonPosition = 1.;
    float stepScale = 0.4;
    for (int i = 0; i < 256; i++) {
        distance = distanceField(rayOrigin + rayDirection * photonPosition);
    	photonPosition += distance * stepScale;
        if (distance < 0.01) break;
    }

 	if (distance < 0.01) {
		vec3 intersectionNormal = calculateNormal(rayOrigin + rayDirection * photonPosition);
        
        //rotate vector:
        vec3 inRot = rotateVec(intersectionNormal, u_time);
            
        float magentaFactor = inRot.x * 0.5 + 0.5;
        float blueFactor = inRot.y * 0.5 + 0.5;

        vec4 magenta = vec4(1., 0, 1., 1.);
        vec4 blue = vec4(0., 0, 1., 1.);
        
        gl_FragColor = magentaFactor * magenta + blueFactor * blue;
    } 
    // else {
    //     gl_FragColor = vec4(0.1, 0.3, 0.4, 0.1);
    // }
}