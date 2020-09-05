const wysiwyg = document.querySelector('#wysiwyg');

ClassicEditor
    .create(wysiwyg)
    .then(editor => {
        //console.log(editor);
    })
    .catch(error => {
        //console.error(error);
    });


if($("data-fancybox").length){
    $("data-fancybox").fancybox()
}

$(function(){
    $('a.confirmDeletion').on('click', function(e){
        if(!confirm('Confirm deletion'))
            return false 
    })
})


const togglePassword = document.querySelector('.togglePassword');
const password = document.querySelector('.password');
togglePassword.addEventListener('click', function (e) {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type)
    if (this.textContent === "visibility_off") {
        this.textContent = "visibility"
    }
    else if (this.textContent === "visibility") {
        this.textContent = "visibility_off"
    }
})
const togglePasswordNew = document.querySelector('.togglePasswordNew');
const passwordNew = document.querySelector('.passwordNew');
togglePasswordNew.addEventListener('click', function (e) {
    const type = passwordNew.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordNew.setAttribute('type', type)
    if (this.textContent === "visibility_off") {
        this.textContent = "visibility"
    }
    else if (this.textContent === "visibility") {
        this.textContent = "visibility_off"
    }
})