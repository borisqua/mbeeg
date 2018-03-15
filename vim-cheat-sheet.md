
# Vim Cheat Sheet

My collection of vim tips to make the best editor even better. This is by no means complete or a tutorial on how to use vim, but a set of commands I don't want to forget and need to write them down before they burn into memory.

See the resources section below for a more complete introduction and a set of in-depth tutorials.

### Navigation

    :nn            " Jump to line nn
    nn|            " Jump to column nn
    

#### Navigation Marks

    ma             " mark spot label it a
    'a             " jump to spot
    ''             " jump to last spot you were
    :marks         " show all marks
    

To create marks across files, use capital letters. I'll use this when working on an HTML View, CSS and Javascript. Mark the three spots H, C, J and easy to jump back and forth.

#### Copy and Paste Registers

Vim has a clipboard history stored in registers, you can also use these registers to cut and paste items to. Your past history of copies is also stored in these registers, use list regiter to find something you thought might be gone since not in clipboard

    "ad            " cut something to register a
    "ap            " paste something from register a
    :reg           " list registers
    

#### Deleting Lines

    S              " delete line and insert mode at start
    :g/regexp/d    " delete all lines that match regexp
    :v/regexp/d    " delete all lines that do NOT regexp
    :v/w{3,}/d   " delete all lines with less than 3-chars
    :15,20d        " delete lines 10-20
    

#### Buffer Management

    :ls             " list open buffers
    :b [num|name]   " switch to buffer 
    :b#             " switch to last buffer
    :bdel #         " delete buffer
    

#### Record Macro

    qa              " start recording macro in buffer a
    [do stuff]
    q               " end recording
    

#### Playback Macro

    @a
    50@a  (50 times)
    

#### Map System Command to Key Stroke

Map ctrl-j d to run system command /tmp/x.py

    :imap <C-j>d <C-r>=system('/tmp/x.py')<CR>
    

#### Toggle Spellcheck

    :map <F5> :setlocal spell! spelllang=en_us<CR>
    

#### Map F1 to Esc

I often find myself trying to hit escape and accidentally hit F1, which opens help. Since, I&rsquo;ve never on purpose hit F1 for help, I map my F1 key to ESC.

    map <F1> <Esc>
    imap <F1> <Esc>
    

#### Customizations

Here are a set of short cuts I have in my vimrc file that simplify some common operations. If I notice myself doing the same thing over and over, I try to add a shortcut when possible.

    " Add spaces inside parentheses, WordPress coding style
    map <Leader>o ci(hp
    
    " Surround word with quote
    map <Leader>' ysiw'
    map <Leader>" ysiw"
    
    " Add Trailing Semi-colon
    map <Leader>; g_a;<Esc>
    
    " Use :w!! to save with sudo
    ca w!! w !sudo tee >/dev/null "%"
    
    

### Vim Plug-ins

One of the best things about vim is all of the available plug-ins. The plugin manager [vim-plug](https://github.com/junegunn/vim-plug) is a nice way to install, update, and manage plugins. Simply specify the plugins in your `.vimrc` and then call `:PlugInstall` Here is my set of plug-ins I use:

```
" use vim-plug to manage plugins
call plug#begin('~/.vim/plugged')
Plug 'fatih/vim-go'
Plug 'junegunn/fzf',  { 'dir': '~/.fzf' }
Plug 'junegunn/fzf.vim'
Plug 'scrooloose/nerdcommenter'
Plug 'SirVer/ultisnips'
Plug 'tpope/vim-surround'
call plug#end()
```

#### Tabular

[Tabular.vim][1] is a very useful plugin to lineup characters amongst several lines, for example lining up the equal sign in a set of variable assignments. [See vimcasts on tabular][2]

#### fzf and ripgrep

fzf and ripgrep are a fuzzy search and fast search tool. They are quick and easy way to open and search files. See my article [Unix is my IDE](https://mkaz.tech/geek/unix-is-my-ide/) on how I setup and use them in vim and the command-line.


### Additional Resources
  * My [.vimrc](https://github.com/mkaz/dotfiles/blob/master/vim/.vimrc) and [.vim dir](https://github.com/mkaz/dotfiles/blob/master/vim/.vim) in my dotfiles repo
  * [Derek Wyatt&rsquo;s Vim Tutorials][4]
  * [Vimcasts: Vim Video Tutorials][5]
  * [25 Tutorial, Screencasts and Resources][6]

 [1]: https://github.com/godlygeek/tabular
 [2]: http://vimcasts.org/episodes/aligning-text-with-tabular-vim/
 [3]: https://github.com/kien/ctrlp.vim
 [4]: http://derekwyatt.org/vim/vim-tutorial-videos/
 [5]: http://vimcasts.org/
 [6]: http://net.tutsplus.com/articles/web-roundups/25-vim-tutorials-screencasts-and-resources/