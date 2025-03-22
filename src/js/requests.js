var BASE_URL = `https://www.rajchandra.me/calculator`;
// https://www.rajchandra.me
// http://localhost:8083

let question_id;
let getFeebackQuestion = ()=>{
    let cookie = getCookie('q1');
    if(!cookie){
        setCookie('q1','false',1000);
    }else if(cookie == 'true'){
        $('#feedback').css({
            "display" : "none"
        });
    }
    if(cookie == 'false' || !cookie){
        axios.get(`${BASE_URL}/feedback/question`)
        .then(function (response) {
            $('#question').html(response.data.q);
            question_id = response.data.id;
            $('#feedback').css({
                "display" : "block"
            });
        })
        .catch(function (error) {
            $('#message-placeholder').html('Something is not right');
            $('#feedback').css({
                "display" : "none"
            });
        });
    }
}
let sendFeedback = ()=>{
    let response = $("input[name='q1']:checked").val();
    let data = {
        response : response,
        id : question_id
    }
    if(response){
        axios.post(`${BASE_URL}/feedback/response`, data)
          .then(function (response) {
            $('#message-placeholder').html(response.data.message);
            if(response.data.code == 0){
                setCookie('q1','true',1000);
                // remove the feeback
                $('#feedback').css({"display" : "none"});
            }
          })
          .catch(function (error) {
            $('#message-placeholder').html("Error Occured!!");
          });
    }else{
        alert('Please select one of the choices!!')
    }
}

//set cookies
let setCookie = (cname, cvalue, exdays)=> {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }
  
//get cookies
let getCookie =(cname) => {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

// Track events with Mixpanel
function track(eventName) {
    try {
        mixpanel.track(eventName);
    } catch (e) {
        console.error('Error tracking event:', e);
    }
}

// Get advertisements with theme-aware styling
function getAds() {
    // Array of advertisement options that will work in both light and dark themes
    const adOptions = [
        {
            title: 'Color Tile Game',
            description: 'Take a break with our fun color-matching game!',
            imageUrl: 'https://color-tile.rajchandra.me/src/images/icons/icon-512x512.png',
            ctaText: 'Play Now',
            ctaUrl: 'https://rajchandra.me/r/0biYgwkl4?s=cgpa-calculator'
        },
        {
            title: 'Install This App',
            description: 'Access the CGPA calculator offline on any device!',
            imageUrl: 'src/images/icons/icon-128x128.png',
            ctaText: 'Install',
            ctaUrl: '#'
        }
    ];

    // Choose a random ad from options
    const randomAd = adOptions[Math.floor(Math.random() * adOptions.length)];

    // Return formatted HTML with Bootstrap theme variables
    return `
    <div class="custom-ads my-3">
        <div class="d-flex align-items-center">
            <div class="flex-shrink-0" style="width: 80px;">
                <img src="${randomAd.imageUrl}" alt="${randomAd.title}" class="img-fluid rounded">
            </div>
            <div class="flex-grow-1 ms-3">
                <h5 class="ad-title">${randomAd.title}</h5>
                <p class="ad-body mb-2">${randomAd.description}</p>
                <a href="${randomAd.ctaUrl}" class="ad-cta btn btn-sm btn-primary" target="_blank" 
                   onclick="track('ad_click_${randomAd.title.replace(/\s+/g, '_').toLowerCase()}')">
                    ${randomAd.ctaText}
                </a>
            </div>
        </div>
    </div>`;
}