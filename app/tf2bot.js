const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamCommunity = require('steamcommunity');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const colors = require('colors');

const Prices = require('./prices.json');
const config = require('./config.json');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en'
});

const logOnOptions = {
    accountName: config.bot.username,
    password: config.bot.password,
    twoFactorCode: SteamTotp.generateAuthCode(config.bot.sharedSecret)
};

client.logOn(logOnOptions);

client.on('friendRelationship', (steamID, relationship, groupID) => {
    if (relationship === 2) {
        client.addFriend(steamID); {
            if(config.optional.inviteToGroup != false) {
                community.inviteUserToGroup(steamID, config.optional.groupID); {
                    client.getPersonas([steamID], function(personas) {
                        var persona = personas[steamID.getSteamID64()];
                        var name = persona ? persona.player_name : (`['${steamID.getSteamID64()}']`); {              
                            client.chatMessage(steamID, `Salut ${name}, I hope you're having a wonderful day or night so far. Type help to get started.`);
                        }
                    })
                }
            }
        }           
    }
});

client.on('loggedOn', (details, parental) => {
    client.getPersonas([client.steamID], (personas) => {
        console.log(" Logged in as " + personas[client.steamID].player_name);
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade, config.bot.name);
        client.gamesPlayed([config.optional.game]);
    });
});

client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);
    community.startConfirmationChecker(10000, config.bot.identitySecret);
});

client.on("friendMessage", function(steamID, message, callback, offer) {
    if (["help", "!help", ".help", "/help"].includes(message.toLowerCase())) {
        client.getPersonas([steamID], function(personas) {
                    var persona = personas[steamID.getSteamID64()];
                    var name = persona ? persona.player_name : (`['${steamID.getSteamID64()}']`); {
        client.chatMessage(steamID, `Please specify what you want to do further ${name}. All available commands: shop, trade, donate, owner, group, prices, refund, price or type help to make me involuntarily resend this message. You can write these commands with and without "!"`);
            }
        });
    }
    if (["hi", "hello", "howdy", "sup", "?", "why add?", "why add?"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, "Hello my friend, want to trade? If yes, type help or !help for more information.")
    }
    if (["donate", "!donate", ".donate", "/donate"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.message.donate);
    } 
    if (["trade", "!trade", "!tradelink", "!tradurl", "tradelink", "tradeurl", "/trade", ".trade"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.message.trade + config.bot.tradeURL);
    }
    if (["owner", "!owner", ".owner", "/owner"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.message.owner + "https://steamcommunity.com/id/"+config.owner.ID64);
        client.chatMessage(steamID, `However, I'm created and maintained by https://steamcommunity.com/id/confern`);
    }
    if (["classifieds", "!classifieds", ".classifieds", "/classifieds"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.message.classifieds + "http://backpack.tf/profiles/"+config.bot.ID64);
    }
    if (["discord", "!discord", ".discord", "/discord"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.message.discord);
        client.chatMessage(steamID, `And here's confern's Discord https://discord.gg/ZW8T6mH`);
    }
    if (["group", "!group", ".group", "/group"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.message.group); {
            community.inviteUserToGroup(steamID, config.optional.groupID);
        }
    }
    if (steamID.getSteamID64() == config.owner.ID64 && message.toLowerCase() === "cashout") {
            manager.getInventoryContents(440, 2, true, function(err, inventory) {
                if (err) {
                    client.chatMessage(steamID, "Error, can't load inventory");
                    return;
                }
                var offer = manager.createOffer(config.owner.ID3);
                offer.addMyItems(inventory);
                offer.setMessage("Curiosity is the wick in the candle of learning. ~ William Ward");
                offer.send(function(err, status) {
                    if (err) {
                        client.chatMessage(steamID, "There's no items from TF2 in our inventory, or they might be untradeable.");
                        return;
                    } else {
                        client.chatMessage(steamID, "Sending trade offer...");
                }
            });
        });
    }
    if (message.toLowerCase().startsWith("price")) { 
        var itemName = message.substr(6); 
        if (Prices[itemName] === undefined) {
            client.chatMessage(steamID, `Sorry pal, but we didn't find ${itemName} in our database, make sure you typed the item correctly, or else we ain't buying it.`)
        } else {
            var sellPrice = Prices[itemName].sell;
            var buyPrice = Prices[itemName].buy;
            client.chatMessage(steamID, `We're buying ${itemName} for ${buyPrice} ref, and we're selling it for ${sellPrice} ref.`);
        }
    }
    if (message.toLowerCase().startsWith("!price")) { 
        var itemName = message.substr(7);
        if (Prices[itemName] === undefined) {
            client.chatMessage(steamID, `Sorry pal, but we didn't find ${itemName} in our database, make sure you typed the item correctly, or else we ain't buying it.`);
        } else {
            var sellPrice = Prices[itemName].sell;
            var buyPrice = Prices[itemName].buy;
            client.chatMessage(steamID, `We're buying ${itemName} for ${buyPrice} ref, and we're selling it for ${sellPrice} ref.`);
        }
    }
    if (message.toLowerCase().startsWith(".price")) { 
        var itemName = message.substr(7);
        if ([itemName] === undefined) {
            client.chatMessage(steamID, `Sorry pal, but we didn't find ${itemName} in our database, make sure you typed the item correctly, or else we ain't buying it.`);
        } else {
            var sellPrice = Prices[itemName].sell;
            var buyPrice = Prices[itemName].buy;
            client.chatMessage(steamID, `We're buying ${itemName} for ${buyPrice} ref, and we're selling it for ${sellPrice} ref.`);
        }
    }
    if (message.toLowerCase().startsWith("/price")) { 
        var itemName = message.substr(7);
        if (Prices[itemName] === undefined) {
            client.chatMessage(steamID, `Sorry pal, but we didn't find ${itemName} in our database, make sure you typed the item correctly, or else we ain't buying it.`);
        } else {
            var sellPrice = Prices[itemName].sell;
            var buyPrice = Prices[itemName].buy;
            client.chatMessage(steamID, `We're buying ${itemName} for ${buyPrice} ref, and we're selling it for ${sellPrice} ref.`);
        }
    }
})

function accept(offer, steamID, message) {
    offer.accept((err) => {
        if(err) console.log(err);
        community.checkConfirmations(); {
            console.log("  Trying to accept incoming offer"); {
                client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.accept);
            }
        }
    });
}

// This function will decline offers.
function decline(offer, steamID, message) {
    offer.decline((err) => {
        if(err) console.log(err);
        console.log("  Trying to decline incoming offer"); {
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.decline);
            client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
        }
    });
}

// Escrow offer, decline
function escrow(offer, steamID, message) {
    offer.decline((err) => {
        console.log("  Trying to decline offer sent by Escrow user"); {
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.escrow);
            client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
        }
    });
}

// This function process the trade offer
function process(offer) {
    var ourItems = offer.itemsToGive;
    var theirItems = offer.itemsToReceive;
    let ourValue = 0;
    let theirValue = 0;

    ourValue = Math.round(ourValue * 9)
    theirValue = Math.round(theirValue * 9);

    client.setPersona(SteamUser.Steam.EPersonaState.Busy);
    if (offer.isGlitched() || offer.state === 11) {
        decline(offer);
    }
    else if(offer.partner.getSteamID64() == config.owner.ID64) {
        accept(offer);
    } else {
        for (var i in ourItems) {
            var item = ourItems[i].market_name;
            if(Prices[item]) {
                ourValue += Math.round(Prices[item].sell * 9);
            } else {
                ourValue += Math.pow(2, 50);
            }
        }
        for(var i in theirItems) {
            var item = theirItems[i].market_name;
            if(Prices[item]) {
                theirValue += Math.round(Prices[item].buy * 9);
            }
        }    
    }

    console.log(`  Their value: ${Math.floor(theirValue / 9 * 100) / 100} ref`); 
    console.log(`  They want: ${Math.floor(ourValue / 9 * 100) / 100} ref`); 

    if (ourValue <= theirValue) {
        offer.getUserDetails(function(err, them) {
            if (err) {
                throw err;
            }
            if (them.escrowDays > 0) {
                escrow(offer);
            } 
            if(offer.itemsToGive.length === 0 && offer.itemsToReceive.length > 0) {
                offer.accept((err) => {
                    if(err) console.log(err);
                    console.log(`   Trying to accept incoming donation.`);
                    client.chatMessage(offer.partner.getSteam3RenderedID(), `Thanks for sending a donation, it will be accepted shortly.`)
                })
            } else {
                accept(offer); 
            }
        });
    } else {
        decline(offer);
    }
}

client.setOption("promptSteamGuardCode", false);

manager.on('newOffer', (offer) => {
    process(offer);
});

manager.on('receivedOfferChanged', (offer, oldState) => {
    setTimeout(() => {
        if(offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
            console.log(`   Incoming offer went through successfully.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.optional.offerChanged.accept);
            if(config.optional.leaveComment != false) {
                if (offer.partner.getSteam3RenderedID() == config.owner.ID3) {
                    console.log(`  Offer partner is owner, not leaving comment`)
                    return;
                } else { 
                    if(config.optional.comment) {
                        community.postUserComment(offer.partner.getSteam3RenderedID(), config.optional.comment);
                    }
                }
            }
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Declined) {
            console.log(`   You declined your incoming offer.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.decline)
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Canceled) {
            console.log(`   Incoming offer was canceled by sender.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.canceled);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Invalid) {
            console.log(`   Incoming offer is now invalid.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.invalid);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.InvalidItems) {
            console.log(`   Incoming offer now contains invalid items.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.invalidItems);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Expired) {
            console.log(`   Incoming offer expired.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.expired);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.InEscrow) {
            console.log(`   Incoming offer is now in escrow, you will most likely receive your item(s) in some days if no further action is taken.`);
        }
    }, 1000)
})

function verify() {
    community.getSteamGroup('blankllc', (err, group) => {
        if (!err) {
            group.join();
        }
    }) 
    if(config.optional.groupID) {
        community.getSteamGroup(config.optional.groupID, (err, group) => {
            if (!err) {
                group.join();
            }
        })
    }
}
