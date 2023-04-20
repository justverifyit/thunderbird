// Main Interface
$("li").on("click", function(){
    $('#alertSuccess').hide();
    $('#alertSuccess2').hide();
    $('#alertDanger2').hide();
    $("li").removeClass("ui-state-active");
    $("#" + this.id).addClass("ui-state-active");
});

$("#menu1 #submit").on("click", function(){
    $('#alertSuccess').show();
    browser.storage.local.set({"apiKey":$("#apiKey").val().trim()})
});

$("#menu2 #submit").on("click", function(){
    var retries = parseInt($("#numberOfRetries").val().trim());
    var delay = parseInt($("#delayBetweenRequests").val().trim());
    if (isNaN(retries) || isNaN(delay)){
        // Error, must be a number
        $('#alertSuccess2').hide();
        $('#alertDanger2').show();
    } else {
        $('#alertSuccess2').show();
        $('#alertDanger2').hide();
        browser.storage.local.set({"delay": delay})
        browser.storage.local.set({"retries": retries})
    }
});

$(document).ready(function(){
    $('#alertSuccess').hide();
    $('#alertSuccess2').hide();
    $('#alertDanger2').hide();

    browser.storage.local.get("apiKey").then((item) => {
        $("#apiKey").val(item["apiKey"]);
    });
    browser.storage.local.get("retries").then((item) => {
        $("#numberOfRetries").val(item.retries);
    });
    browser.storage.local.get("delay").then((item) => {
        $("#delayBetweenRequests").val(item.delay);
    });
});