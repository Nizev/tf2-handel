# tf2bot
Firstly to get the bot up and running double click install.bat to install all neccessary npms.
Now configure config.json under app. It's important to fill in all them.
When this is done you can head on into prices.json to configure your prices. To add more items simply add a , to the end of line 21 and copy everything from "Mann Co. Supply Crate.. to }, and paste this multiple times under. Change the name of the item and add your prices, now when done remove the second to last line's ,

Eg: 
{
	"Scrap Metal":
	{
		"buy": 0.11,
		"sell": 0.11
	},
	"Reclaimed Metal":
	{
		"buy": 0.33,
		"sell": 0.33
	},
	"Refined Metal":
	{
		"buy": 1,
		"sell": 1
	},
	"Mann Co. Supply Crate Key":
	{
		"buy": 32,
		"sell": 32.11
	},
  "Backpack Expander":
	{
		"buy": 14.11,
		"sell": 14.22
	},
  "Team Captain":
	{
		"buy": 1.11,
		"sell": 1.22
	}
}

You're finnished, congratulations.
