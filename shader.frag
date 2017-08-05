// Author: Dustin Freeman
// Title: GenLang
// Code: https://github.com/dustinfreeman/genarthackparty2017-lang

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

    //the call to length is the most costly in this entire thing.
    return length( pa - ba*h ) - r;
}

//t.x = tube radius; t.y = tube fatness
float torusDF( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float smin(float a, float b, float k) {
    float res = exp(-k*a) + exp(-k*b);
    return -log(res)/k;
}

highp float rand(vec2 co)
{
    const highp float a = 12.9898;
    const highp float b = 78.233;
    const highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

highp float rand(float f)
{
    //highp float a = 12.9898;
    //highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = f;
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

float gen_letter(float d, vec3 pt, vec3 pos, float index) {
    const float thin_stroke = 0.02;
    const float thicc_stroke = 0.06;
    
    //this is how we get good performance
    if (distance(pt.xy, pos.xy) > 1.3) {
         return d;
    }
    
    if (index < 0. || index > 32.) {
        //no letter, e.g. space
        return d;
    }
    
    vec2 mouse = u_mouse/u_resolution;
    float blobby = 0.;
    float ital = 0.;
    ital = 1.; //default style is ital
    
    if (0.3 < mouse.y && mouse.y < 0.7) {
        if (mouse.x > 0.6) {
            ital = 0.0; //formal
        } else if (mouse.x > 0.3) {
            ital = 0.;
            blobby = 1.0;
        }
    } 
    
    //settings for presentation
    float present = mod(u_time, 30.)/30.;;
    if (present < 0.25) {
        ital = 0.; blobby = 0.;
    } else if (present < 0.5) {
        ital = 1.; blobby = 0.;
	} else if (present < 0.75) {
        ital = 0.; blobby = 1.;
	} else {
        ital = 1.; blobby = 1.;
    }

    if (ital > 0.5) {
        float ext = distance(pt.xy, pos.xy);
        ext = 0.5*(1. - ext);
        //italiswirl
        vec3 df = pt - pos;
        df.x =  df.x*cos(ext) + df.y*sin(ext);
        df.y = -df.x*sin(ext) + df.y*cos(ext);
        pt = df + pos;
    }
    
    float num_strokes = 1. + floor(rand(index) * 3.);
    float stroke_index = 0.;
    for (int i = 0; i < 5; i++) {
        vec2 start = vec2(floor(rand(index + stroke_index + 0.) * 3.)/3., 
                          floor(rand(index + stroke_index + 1.) * 3.)/3.);
        vec2 end =   vec2(floor(rand(index + stroke_index + 2.) * 3.)/3., 
                          floor(rand(index + stroke_index + 3.) * 3.)/3.);
        
        float newD = capsuleDF(pt, 
    		vec3(start + pos.xy, pos.z),
    		vec3(end + pos.xy, pos.z),
    		thin_stroke + thicc_stroke*floor(rand(index + stroke_index) * 2.)
    		);
        
        if (blobby > 0.5) {
    		d = smin(d, newD , 40.);
        } else {
            d = min(d, newD);
        }
        
        stroke_index += 1.;
        if (stroke_index > num_strokes) break;
    }
        
    const float sQuant = 4.;
    float newD = sphereDF(pt, 
                       vec3(vec2(floor(sQuant*rand(index))/sQuant,
                                 floor(sQuant*rand(index))/sQuant) + 
                                 pos.xy, pos.z),
                       2.5* (thin_stroke + 
                            thicc_stroke*floor(rand(index) * 2.))
                        );
    if (blobby > 0.5) {
    		d = smin(d, newD , 10.1);
        } else {
            d = min(d, newD);
        }
    //can't get sphere smin over 10.2 or culling bug appears HARD
    
    return d;
}

float distanceField(vec3 pt) {
    float d = 100.;
    
    const float text_depth = -8.;// + mod(u_time, 1.);
    const float letter_gap = 1.2;
    const float row_gap = 1.2;
    
    const float num_letters_row_p = 5.;
    
    //There are 32 letters in the gen alphabet
    //TODO: make 'em words
    const float num_letters_row_0 = 8.;
    const float num_letters_row_1 = 10.;
    const float num_letters_row_2 = 14.;
    const float num_letters = 32.;
    
    
    vec2 mouse = u_mouse/u_resolution;
    //show five characters, for presentation.
    if (mouse.y > 0.7) {
        for (float i = 0.; i < num_letters_row_p; i++) {
            
            float letter_test = mouse.x*(32. - num_letters_row_p);
            float letter_index = i + 
                floor(letter_test);
            
            if (letter_index >= 32.) continue;
            
        	d = gen_letter(d, pt, 
        		vec3(-num_letters_row_p/2. + i*letter_gap - 
                     fract(letter_test), 
                     row_gap, text_depth), letter_index);
        }
    }
    
    
    //edges of screen: -4 to 4
    //moving rows:
    float rate = u_time*1.0;
    float ticker_row_0 = -1.*mod(rate, 2.*num_letters_row_0 + 1.) + 4.;
	//ticker_row_0 = -3.;
    // d = gen_letter(d, pt, vec3(-4., 0., text_depth), 0.);
    // d = gen_letter(d, pt, vec3(0., 0., text_depth), 0.);

    //uncomment to stop word motion.
    //ticker = -2.;
    for (float i = 0.; i < 8.; i++) {
        float letter_index = mod(i + floor(rate/letter_gap), 
                                 num_letters);
    	d = gen_letter(d, pt, 
        		vec3(-4. - mod(rate, letter_gap) + i*letter_gap, 
                 0., text_depth), 
    		letter_index);
    }
    
    //transitioning between letters
    const float trans_dur = 2.;
    float trans_seed = floor(u_time/trans_dur);
    float trans_prog = mod(u_time, trans_dur)/trans_dur;
    for (float i = 0.; i < 6.; i++) {
    	float letter_index1 = floor(num_letters * rand(trans_seed+i));
        // float letter_index1 = floor(u_time/trans_dur);
        float d1 = gen_letter(d, pt, 
        		vec3(-3. + i*letter_gap, 
                 -row_gap, text_depth), 
    		letter_index1);
        
        float letter_index2 = floor(num_letters * rand(trans_seed+i+1.));
        // float letter_index2 = floor(u_time/trans_dur) + 1.;
        float d2 = gen_letter(d, pt, 
        		vec3(-3. + i*letter_gap, 
                 -row_gap, text_depth), 
    		letter_index2);
        
        float prog = cos(trans_prog * 3.14/2.0);
        d = prog*d1 + (1.-prog)*d2;
    }
    
    
    //words
    const float word_dur = 3.;
    const float letter_dur = 0.25;
    float word_seed = floor(u_time/word_dur);
    float word_length = 8. + floor(4.*rand(word_seed));
    float word_letter = floor(mod(u_time, word_dur)/letter_dur);
    float word_letter_prog = mod(u_time, letter_dur)/letter_dur;
    // if (mouse.y < 0.3)
    {
    	float letter_index1 = 50.;
        if (word_letter < word_length) {
            letter_index1 = rand(word_seed + word_letter);
        }
        // float letter_index1 = floor(u_time/trans_dur);
        float d1 = gen_letter(d, pt, 
        		vec3(-1., -2.5*row_gap, text_depth), 
    		letter_index1);
        
        float letter_index2 = 50.;
        if (word_letter + 1. < word_length) {
            letter_index2 = rand(word_seed + word_letter + 1.);
        }
        // float letter_index2 = floor(u_time/trans_dur) + 1.;
        float d2 = gen_letter(d, pt, 
        		vec3(-1., -2.5*row_gap, text_depth), 
    		letter_index2);
        
        float prog = cos(word_letter_prog * 3.14/2.0);
        d = prog*d1 + (1.-prog)*d2;
    }
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
    const vec3 rayOrigin = vec3 (0.,0.,1.5);
    vec3 rayDirection = normalize(vec3(st, 0.) - rayOrigin);
    
    float distance;
    float photonPosition = 1.;
    float stepScale = 1. + 0.001*sin(u_time);
    for (int i = 0; i < 5; i++) {
        distance = distanceField(rayOrigin + rayDirection * photonPosition);
    	photonPosition += distance * stepScale;
        if (distance < 0.01) break;
    }

    vec3 intersectionNormal = calculateNormal(rayOrigin + 
                        rayDirection * photonPosition);

    //rotate vector:
    vec3 inRot = rotateVec(intersectionNormal, u_time*0.3);
        
 	if (distance < 0.01) {
		gl_FragColor += vec4(vec2(inRot)*0.5 + 0.2, 0.3, 0.);
    } else if (distance < 10.) {
        float magentaFactor = inRot.x * 0.5 + 0.5;
        float blueFactor = inRot.y * 0.5 + 0.5;

        const vec4 magenta = vec4(1., 0, 1., 1.);
        const vec4 blue = vec4(0., 0, 1., 1.);
        
        gl_FragColor = magentaFactor * magenta + blueFactor * blue;
    } 
}