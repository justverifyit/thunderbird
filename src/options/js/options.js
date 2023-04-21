// Locales setup
$("#tab1").html(browser.i18n.getMessage("general.tab.1"));
$("#tab2").html(browser.i18n.getMessage("general.tab.2"));

$("#menu1 #title").html(browser.i18n.getMessage("options.menu1.title"));
$("#menu1 #description").html(browser.i18n.getMessage("options.menu1.description"));
$("#menu1 #label1").html(browser.i18n.getMessage("options.menu1.label1"));
$("#menu1 #help").html(browser.i18n.getMessage("options.menu1.help"));
$("#menu1 #alertSuccess").html(browser.i18n.getMessage("options.menu1.alertSuccess"));
$("#menu1 #submit").html(browser.i18n.getMessage("options.menu1.submit"));

$("#menu2 #title").html(browser.i18n.getMessage("options.menu2.title"));
$("#menu2 #description").html(browser.i18n.getMessage("options.menu2.description"));
$("#menu2 #label1").html(browser.i18n.getMessage("options.menu2.label1"));
$("#menu2 #delayHelp").html(browser.i18n.getMessage("options.menu2.delayHelp"));
$("#menu2 #label2").html(browser.i18n.getMessage("options.menu2.label2"));
$("#menu2 #retryHelp").html(browser.i18n.getMessage("options.menu2.retryHelp"));
$("#menu2 #alertSuccess2").html(browser.i18n.getMessage("options.menu2.alertSuccess"));
$("#menu1 #alertDanger2").html(browser.i18n.getMessage("options.menu2.alertDanger"));
$("#menu2 #submit").html(browser.i18n.getMessage("options.menu2.submit"));

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