const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamCommunity = require('steamcommunity');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const moment = require('moment');
const colors = require('colors');

const package = require('./../package.json');
const Prices = require('./prices.json');
const config = require('./config.json');

const print = console.log;

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en'
});

let msg;
let info;

let ready = false;

let ours = 0;
let theirs = 0;

const settings = {
    accountName: config.bot.username,
    password: config.bot.password,
    twoFactorCode: SteamTotp.generateAuthCode(config.bot.sharedSecret)
};

TF2Api();

client.logOn(settings);

client.on('friendRelationship', (steamID, relationship) => {
    if(relationship == 2)
        client.addFriend(steamID); {
            if(config.optional.inviteToGroup) 
                community.inviteUserToGroup(steamID, config.optional.groupID);
                client.getPersonas([steamID], (personas) => {
                    var persona = personas[steamID.getSteamID64()];
                    var name = persona ? persona.player_name : (`['${steamID.getSteamID64()}']`);
                    client.chatMessage(steamID, config.message.welcome.replace('[name]', name));
        });
    }
});  

checkUpdate();

client.on('loggedOn', (details, parental) => {
    client.getPersonas([client.steamID], (personas) => {
        print(`${log('info')} Logged in as ${personas[client.steamID].player_name}`);
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade, config.bot.name);
        if (config.optional.game) 
            client.gamesPlayed([package.name, config.optional.game])
        else 
            client.gamesPlayed([package.name])
        setTimeout(() => {
            verify()
        }, 1000)
    });
});

client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);
});

const commands = [
    'help',
    '\nprice',
    '\ngroup',
    '\nowner',
    '\ndonate',
    '\ndiscord',
    '\nclassifieds',
    '\ncommands' 
]

client.on("friendMessage", (steamID, message) => {
    hasPrefix(message);
    if(msg.toLowerCase().startsWith("price")) { 
        if (config.options.priceCommand === true || steamID.getSteamID64() === config.owner.ID64) {
            var item = message.substr(6); 
            if (Prices[item] === undefined) {
                client.chatMessage(steamID, `Sorry pal, but we didn't find ${item} in our database, make sure you typed the item correctly (capitals matter), or else we ain't buying it.`)
            } else {
                var sell = Prices[item].sell;
                var buy = Prices[item].buy;
                client.chatMessage(steamID, `We're buying ${item} for ${buy} ref, and we're selling it for ${sell} ref.`);
                client.chatMessage(steamID, `Not your item? Try price 'Non-Craftable <item>'`);
            }
        } else {
            client.chatMessage(steamID, `Sorry but this command has been disabled by admin.`);
            client.chatMessage(steamID, `However you can find our backpack.tf classifieds by typing 'classifieds' or 'listnings.'`);
        }
    }
    else if(msg.toLowerCase().indexOf('help') > -1) {
        client.chatMessage(steamID, `Here's a list of all available commands:\n${commands}`);
    }
    else if(msg.toLowerCase().indexOf('commands') > -1) {
        client.chatMessage(steamID, `Here's a list of all available commands:\n${commands}`);
    }
    else if(msg.toLowerCase().indexOf('classifieds') > -1) {
        client.chatMessage(steamID, config.message.classifieds.replace('[bptflink]', `https://backpack.tf/classifieds?page=1&steamid=${config.bot.ID64}`));
    }
    else if(msg.toLowerCase().indexOf('donate') > -1) {
        client.chatMessage(steamID, config.message.donate.replace('[tradeurl]', config.account.tradeURL));
    } 
    else if(msg.toLowerCase().indexOf('trade') > -1) {
        client.chatMessage(steamID, config.message.trade.replace('[tradeurl]', config.account.tradeURL));
    }
    else if(msg.toLowerCase().indexOf('owner') > -1) {
        client.chatMessage(steamID, config.message.owner.replace('[owner]', 'http://steamcommuntiy.com/id/'+config.owner.ID64));
    }
    else if(msg.toLowerCase().indexOf('discord') > -1) {
        client.chatMessage(steamID, config.message.discord);
    }
    else if(msg.toLowerCase().indexOf('group') > -1) {
        client.chatMessage(steamID, config.message.group); {
            community.inviteUserToGroup(steamID, config.bot.groupID);
        }
    } else {
        client.chatMessage(steamID, `${msg} is not a command. Use 'commands' to get a list of all available commands.`);
    }
})

function accept(offer) {
    offer.accept((err) => {
        if(err) print(`${log('err')} ${err}`);
        if(offer.itemsToGive.length > 0) {
            community.checkConfirmations();
        }
        print(`${log('trade')}  Trying to accept incoming offer`);
        client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.accept);
    });
}

// This function will decline offers.
function decline(offer) {
    offer.decline((err) => {
        if(err) print(`${log('err')} ${err}`);
        print(`${log('trade')}  Trying to decline incoming offer`);
        client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.decline);
    });
}

// Escrow offer, decline
function escrow(offer) {
    offer.decline((err) => {
        print(`${log('trade')}  Trying to decline offer sent by Escrow user`);
        client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.escrow);
    });
}

function isTF2(item) {
    if(item.appid == 440) return true
    else return false
}

// This function process the trade offer
function process(offer) {
    client.setPersona(SteamUser.Steam.EPersonaState.Busy);
    var our_items = offer.itemsToGive;
    var their_items = offer.itemsToReceive;

    if(offer.isGlitched() || offer.state == 11)
        decline(offer);
    else if(offer.partner.getSteamID64() == config.owner.ID64) 
        accept(offer);
    else
        for (var i in our_items)
            var item = our_items[i];
            var name = item.market_hash_name
            if(isTF2()) {
                if(Prices[name]) 
                    ours += Math.ceil(Prices[name].sell * 9);
            else 
                ours += Math.pow(2, 50)
            }
                
        for(var i in their_items) 
            var item = their_items[i];
            var name = item.market_hash_name;
            if(isTF2()) {
                if(Prices[name])
                    theirs += Math.ceil(Prices[name].buy * 9);
            }

    print(`${log('trade')} Their value: ${Math.floor(theirs / 9 * 100) / 100} ref`); 
    print(`${log('trade')} They want: ${Math.floor(ours / 9 * 100) / 100} ref`); 

    if (ours <= theirs) {
        offer.getUserDetails((err, them) => {
            if (err) {
                throw err;
            }
            else if(offer.itemsToGive.length == 0 && offer.itemsToReceive.length > 0) {
                offer.accept((err) => {
                    if(err) print(`${log('trade')} ${err}`);
                    print(`${log('trade')}   Trying to accept incoming donation.`);
                    client.chatMessage(offer.partner.getSteam3RenderedID(), `Thanks for sending a donation, it will be accepted shortly.`)
                })
            }
            else if (them.escrowDays > 0) {
                escrow(offer);
            } else {
                accept(offer); 
            }
        });
    } else {
        decline(offer);
    }
}

function isCraftable(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function isCraftWeapon(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function isUnusual(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function getEffect(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function isSkin(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function getSkin(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function getWear(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function getLevel(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function getEffect(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function isPainted(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function isTradingCard(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function getGemAmount(item) {
    // Might introduced in a later update, still unsure if I should add it.
}

function verify() {
    community.getSteamGroup('blankllc', (err, group) => {
        if(!err)
            group.join();
    }) 
    if(config.optional.groupID)
        community.getSteamGroup(config.optional.groupID, (err, group) => {
            if(!err)
                group.join();
    })
    ready = true;
    checkUpdate();
}

function TF2Api() {
    if(ready) {
        const request = require('request');
        var options = {
            url: 'http://steamgaug.es/api/v2',
            method: 'GET',
        };
        function test(error, JSONresponse, body) {
            var page = JSON.parse(body);
            if(error) 
                print(error);
            if(page.IEconItems["440"].error != "No Error") {
                apiDown = true;
                print(`${log('warn')} TF2's API is currently down. ${page.IEconItems["440"].error}. Checking API every 5 minutes.`)
            } else {
                apiDown = false;
                print(`${log('info')} TF2's Api is up and running. ${page.IEconItems["440"].error}.`)
            }
        }
        request(options, test) 
    }
}

function hasPrefix(message) {
    if(message.startsWith("!" || "." || "/" || "$" || "?")) 
        msg = message.substr(1);
}

function log(info) {
    return `${package.name} | `.green + `${moment().format('LTS')} `+
    `${info == "info" ? info.green : ""+info == "trade" ? info.magenta : ""+info == "warn" ? info.yellow : ""}:`
}

function checkUpdate() {
    const request = require('request');
    var options = {
        url: 'https://raw.githubusercontent.com/confernn/tf2-handel/master/package.json',
        method: 'GET',
    };
    function look(error, JSONresponse, body) {
        var page = JSON.parse(body)
        print(page);
        if(page.version != package.version)
            print(`${log('warn')} ${'New update available for '+package.name+ ' v'+page.version+'! You\'re currently only running version '+package.version+'\n                               Go to http://github.com/confernn/tf2-handel to update now!'}`)
    }
    request(options, look)
}

client.setOption("promptSteamGuardCode", false);

if(ready) {
    manager.on('newOffer', process);
}

manager.on('receivedOfferChanged', (offer, oldState) => {
    setTimeout(() => {
        if(offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
            print(`${log('trade')}   Incoming offer went through successfully.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.optional.offerChanged.accept);
            if(config.optional.leaveComment) {
                if (offer.partner.getSteamID64 == config.owner.ID64) {
                    print(`${log('trade')}  Offer partner is owner, not leaving comment`)
                    return;
                } else { 
                    if(config.optional.comment) {
                        community.postUserComment(offer.partner.getSteam3RenderedID(), config.optional.comment);
                    }
                }
            }
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Declined) {
            print(`${log('trade')}   You declined your incoming offer.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.decline)
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Canceled) {
            print(`${log('trade')}   Incoming offer was canceled by sender.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.canceled);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Invalid) {
            print(`${log('trade')}   Incoming offer is now invalid.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.invalid);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.InvalidItems) {
            print(`${log('trade')}   Incoming offer now contains invalid items.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.invalidItems);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Expired) {
            print(`${log('trade')}   Incoming offer expired.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.expired);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.InEscrow) {
            print(`${log('trade')}   Incoming offer is now in escrow, you will most likely receive your item(s) in some days if no further action is taken.`);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Active) {
            if(offer.partner.getSteamID64() == config.owner.ID64) {
                client.chatMessage(offer.partner.getSteam3RenderedID(), `Your cashout offer is now active, click 'View trade offer' above to accept it!`);
            }
            print(`${log('trade')}   Sent offer is now active.`);
        }
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
    }, 1000)
})

setInterval(()=> {TF2Api()}, 36000000);
