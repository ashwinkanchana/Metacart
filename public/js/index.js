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