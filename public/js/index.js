if($("data-fancybox").length){
    $("data-fancybox").fancybox()
}

$(function(){
    $('a.confirmDeletion').on('click', function(e){
        if(!confirm('Confirm deletion'))
            return false 
    })
})