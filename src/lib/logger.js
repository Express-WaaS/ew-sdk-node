import { inspect } from "util"
import chalk from "chalk"

export default (name, name_color) => ({
	log: (data) => {
		console.log(
			`===========>\n[${name_color(name)}]\n`,
			inspect(
				{
					type: "LOG",
					timestamp: new Date(),
					...data,
				},
				{
					showHidden: false,
					depth: null,
					colors: true,
				}
			),
			"\n"
		)
	},
	error: (data) => {
		console.log(
			`===========>\n[${chalk.red(name)}]\n`,
			inspect(
				{
					type: "ERROR",
					timestamp: new Date(),
					...data,
				},
				{
					showHidden: false,
					depth: null,
					colors: true,
				}
			),
			"\n"
		)
	},
})
