import { inspect } from 'util'
import chalk from 'chalk'
import configs from '../configs.js'

export default (name, name_color) => ({
    log: data => {
        configs.log() &&
            console.log(
                `===========>\n[${name_color(name)}]\n`,
                inspect(
                    {
                        type: 'LOG',
                        timestamp: new Date(),
                        ...data,
                    },
                    {
                        showHidden: false,
                        depth: null,
                        colors: true,
                    }
                ),
                '\n'
            )
    },
    error: data => {
        configs.log() &&
            console.log(
                `===========>\n[${chalk.red(name)}]\n`,
                inspect(
                    {
                        type: 'ERROR',
                        timestamp: new Date(),
                        ...data,
                    },
                    {
                        showHidden: false,
                        depth: null,
                        colors: true,
                    }
                ),
                '\n'
            )
    },
})
