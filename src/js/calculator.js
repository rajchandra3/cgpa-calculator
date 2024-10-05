// Add this function at the beginning of the file
function roundToTwo(num) {
    if (isNaN(num)) return 0;
    // Round to two decimal places with special handling for the third decimal
    let rounded = Math.round(num * 1000) / 1000; // Round to 3 decimal places
    let decimalPart = rounded - Math.floor(rounded);
    let thirdDecimal = Math.round((decimalPart * 1000) % 10);
    
    if (thirdDecimal >= 5) {
        rounded = Math.ceil(rounded * 100) / 100;
    } else {
        rounded = Math.floor(rounded * 100) / 100;
    }
    
    return rounded;
}

//Expected Marks
var getMarks = function(){
    var marksCat1 = parseFloat($('#cat1').val());
    var marksCat2 = parseFloat($('#cat2').val());
    var marksDa = parseFloat($('#da').val());
    var marksAl = parseFloat($('#al').val()) || 0;
    var marksLab = parseFloat($('#lab').val());
    var marksProj = parseFloat($('#j-comp').val());
    var marksFat = parseFloat($('#fat').val());
    var choice,netMarks;
    if(marksLab && marksProj){
        choice = 3;
    }else if(marksLab && !marksProj){
        choice = 2;
    }else if(marksProj && !marksLab){
        choice = 1;
    }else if(!marksProj && !marksLab){
        choice = 0; //subjects like ALA - MAT3004
    }
    var internals = ((marksCat1 + marksCat2)*0.5 + marksDa + marksAl);
    var tot = (internals > 60 ? 60 : internals)+ marksFat * 0.4 ;
    switch(choice){
        case 0:
            netMarks = tot;
            break;
        case 1:
            netMarks = tot*0.75 + marksProj * 0.25;
            break;
        case 2:
            netMarks = tot*0.75 + marksLab * 0.25;
            break;
        case 3:
            netMarks = tot*0.6 + marksLab * 0.2 + marksProj * 0.2 ;
            break;
    }
    if(isNaN(netMarks)){
        $('#modal-body').html('Insufficient Data !!');
        $('#modal-error').modal('show');
    }
    else{
        $('.alert-marks').show();
        $('#marks').html(`<h1 class="result-text">${roundToTwo(netMarks)}</h1>`);
    }
    $('.adsEMC').html(getAds());
}

/*
* Quick CGPA CALCULATOR
* */
$('#submit').click(function(){
    document.getElementById('cgpa-msg').classList.remove("hide");
    // document.getElementById('cbtn').className="btn btn-warning hide";
    var cgpa=parseFloat($('#cgpa').val());
    var gpa=parseFloat($('#gpa').val());
    var c=parseFloat($('#c').val());
    var tc=parseFloat($('#tc').val());

    var f=(((cgpa*tc)+(gpa*c))/(tc+c));
    if(isNaN(f)){
        $('#modal-body').html('Insufficient Data !!');
        $('#modal-error').modal('show');
        f="Unavailable";
    }else{
        $('.alert-cgpa-msg').show();
        document.getElementById('cgpa-msg').innerHTML=`<h1 class="result-text">${roundToTwo(f)}</h1>`;
    }
    $('.adsQCC').html(getAds());
});

/*
* ALL SEMESTER CGPA CALCULATOR
* */

//All semester cgpa
$('#sem-cgpa-btn').on('click',function(){
    var gpa1, gpa2, gpa3, gpa4, gpa5, gpa6, gpa7, gpa8,fc1=0, fc2=0, fc3=0, fc4=0, fc5=0, fc6=0, fc7=0, fc8=0,fcgpa=0;
    gpa1=$('#gpa1').val();
    fc1 = $('#fc1').val();
    if(gpa1 =='' || fc1===''){
        fc1 = 0;
        gpa1 = 0;
    }
    gpa2=$('#gpa2').val();
    fc2 = $('#fc2').val();
    if(gpa2 =='' || fc2===''){
        fc2 = 0;
        gpa2 = 0;
    }
    gpa3=$('#gpa3').val();
    fc3 = $('#fc3').val();
    if(gpa3 =='' || fc3===''){
        fc3 = 0;
        gpa3 = 0;
    }
    gpa4=$('#gpa4').val();
    fc4 = $('#fc4').val();
    if(gpa4 =='' || fc4===''){
        fc4 = 0;
        gpa4 = 0;
    }
    gpa5=$('#gpa5').val();
    fc5 = $('#fc5').val();
    if(gpa5 =='' || fc5===''){
        fc5 = 0;
        gpa5 = 0;
    }
    gpa6=$('#gpa6').val();
    fc6 = $('#fc6').val();
    if(gpa6 =='' || fc6===''){
        fc6 = 0;
        gpa6 = 0;
    }
    gpa7=$('#gpa7').val();
    fc7 = $('#fc7').val();
    if(gpa7 =='' || fc7===''){
        fc7 = 0;
        gpa7 = 0;
    }
    gpa8=$('#gpa8').val();
    fc8 = $('#fc8').val();
    if(gpa8 =='' || fc8===''){
        fc8 = 0;
        gpa8 = 0;
    }
    
    var totalCredits = fc1*1 + fc2*1 + fc3*1 + fc4*1 + fc5*1 + fc6*1 + fc7*1 + fc8*1;
    
    if (totalCredits === 0) {
        $('#modal-body').html('Total credits cannot be zero');
        $('#modal-error').modal('show');
    } else {
        fcgpa = ((parseFloat(gpa1)*fc1)+(parseFloat(gpa2)*fc2)+(parseFloat(gpa3)*fc3)+(parseFloat(gpa4)*fc4)+(parseFloat(gpa5)*fc5)+(parseFloat(gpa6)*fc6)+(parseFloat(gpa7)*fc7)+(parseFloat(gpa8)*fc8)) / totalCredits;
        
        if(isNaN(fcgpa)){
            $('#modal-body').html('Insufficient Data !!');
            $('#modal-error').modal('show');
        }
        else{
            $('.alert-fcgpa').show();
            $('#fcgpa').html(`<h1 class="result-text">${roundToTwo(fcgpa)}</h1>`);
        }
    }
    $('.adsASCC').html(getAds());
});

/*
* GPA CALCULATOR
* */
$('#gbtn').on('click',function(){
    var g1=0,g2=0,g3=0,g4=0,g5=0,g6=0,g7=0,g8=0,g9=0,g10=0,c1=0,c2=0,c3=0,c4=0,c5=0,c6=0,c7=0,c8=0,c9=0,c10=0,sum=0,gpa=0;
    g1=parseFloat($('#g1').val()) || 0,
    g2=parseFloat($('#g2').val()) || 0,
    g3=parseFloat($('#g3').val()) || 0,
    g4=parseFloat($('#g4').val()) || 0,
    g5=parseFloat($('#g5').val()) || 0,
    g6=parseFloat($('#g6').val()) || 0,
    g7=parseFloat($('#g7').val()) || 0,
    g8=parseFloat($('#g8').val()) || 0,
    g9=parseFloat($('#g9').val()) || 0,
    g10=parseFloat($('#g10').val()) || 0,
    c1=parseFloat($('#c1').val()) || 0,
    c2=parseFloat($('#c2').val()) || 0,
    c3=parseFloat($('#c3').val()) || 0,
    c4=parseFloat($('#c4').val()) || 0,
    c5=parseFloat($('#c5').val()) || 0,
    c6=parseFloat($('#c6').val()) || 0,
    c7=parseFloat($('#c7').val()) || 0,
    c8=parseFloat($('#c8').val()) || 0,
    c9=parseFloat($('#c9').val()) || 0,
    c10=parseFloat($('#c10').val()) || 0;
    gpa=(c1*g1+c2*g2+c3*g3+c4*g4+c5*g5+c6*g6+c7*g7+c8*g8+c9*g9+c10*g10)/(c1+c2+c3+c4+c5+c6+c7+c8+c9+c10);

    if(isNaN(gpa)){
        $('#modal-body').html('Insufficient Data !!');
        $('#modal-error').modal('show');
        gpa="Unavailable";
    }else{
        $('.alert-grades').show();
        $('#grades').html(`<h1 class="result-text">${roundToTwo(gpa)}</h1>`);
        // document.getElementById('reset').classList.remove("hide");
    }
    $('.adsGC').html(getAds());
});

function clearAll(){
    $('#g1').val('0');$('#g2').val('0');$('#g3').val('0');$('#g4').val('0');$('#g5').val('0');$('#g6').val('0');$('#g7').val('0');$('#g8').val('0');$('#g9').val('0');$('#g10').val('0');
    $('#c1').val('0');$('#c2').val('0');$('#c3').val('0');$('#c4').val('0');$('#c5').val('0');$('#c6').val('0');$('#c7').val('0');$('#c8').val('0');$('#c9').val('0');$('#c10').val('0');
}

/*
* VALIDATION
* */

$('.cgpa-input').on('keyup',function(){
    var input=document.getElementById(this.id).value;
    if(!input==''){
        var re=/^\d+\.?\d{0,2}$/;
        if (!(re.test(input))){
            $('#modal-body').html('Please enter a valid data');
            $('#modal-error').modal('show');
            $(this).val('');
        }
    }
    if((input>10 || input<0) && this.id==='gpa'){
        $('#modal-body').html('Your GPA should be between 0 and 10 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>10 || input<0) && this.id==='cgpa'){
        $('#modal-body').html('Your CGPA should be between 0 and 10 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>39 || input<0) && this.id==='c'){
        $('#modal-body').html('Your Credits should be between 16 and 39 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>250 || input<0) && this.id==='tc'){
        $('#modal-body').html('Your Credits should be between 0 and 250 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
});

$('.form-control').on('keyup',function(){
    var input = document.getElementById(this.id).value;
    if(input !== ''){
        var re = /^\d*\.?\d{0,2}$/;
        if (!re.test(input)){
            $('#modal-body').html('Please enter a valid number with up to 2 decimal places');
            $('#modal-error').modal('show');
            $(this).val('');
        }
    }
    if((input>10 || input<0) && (this.id==='gpa1' || this.id==='gpa2' || this.id==='gpa3' || this.id==='gpa4' || this.id==='gpa5' || this.id==='gpa6' || this.id==='gpa7' || this.id==='gpa8')){
        $('#modal-body').html('Your GPA should be between 0 and 10 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>30 || input<0) && (this.id==='cat1' || this.id==='cat2' || this.id==='nf-cat1' || this.id==='nf-cat2')){
        $('#modal-body').html('Your marks should be between 0 and 30 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>30 || input<0) && (this.id==='cat1' || this.id==='cat2')){
        $('#modal-body').html('Your marks should be between 0 and 30 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>30 || input<0) && (this.id==='nf-cat1' || this.id==='nf-cat2')){
        $('#modal-body').html('Your marks should be between 0 and 30 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    // else if( (input>60 || input<0) && (this.id==='nf-lab')){
    //     $('#modal-body').html('Your marks should be between 0 and 60 !');
    //     $('#modal-error').modal('show');
    //     $(this).val('');
    // }
    else if((input>30 || input<0) && (this.id==='da' || this.id==='nf-da')){
        $('#modal-body').html('Your marks should be between 0 and 30 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>10 || input<0) && (this.id==='al' || this.id==='nf-al')){
        $('#modal-body').html('Additional Learning marks should be between 0 and 10 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>100 || input<0) && (this.id==='lab' || this.id==='nf-lab' || this.id==='j-comp' || this.id==='nf-j-comp' || this.id==='fat')){
        $('#modal-body').html('Your marks should be between 0 and 100 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
    else if((input>39 || input<0) && (this.id==='fc1' || this.id==='fc2' || this.id==='fc3' || this.id==='fc4' || this.id==='fc5' || this.id==='fc6' || this.id==='fc7' || this.id==='fc8')){
        $('#modal-body').html('Your Credits should be between 16 and 39 !');
        $('#modal-error').modal('show');
        $(this).val('');
    }
});

