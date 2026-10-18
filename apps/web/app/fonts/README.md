# Fonts

Self-hosted font assets, served by `next/font` (no third-party requests at runtime).

## `MaterialSymbolsOutlined.woff2`

Google **Material Symbols Outlined**, subsetted to only the glyphs used by
`<Icon />` (`apps/web/app/components/Icon.tsx`) — 5.8 kB instead of the 4 MB
full variable font. Fixed axes: `opsz=24`, `wght=400`, `FILL=0`, `GRAD=0`.

Regenerate after adding a new icon name:

1. Add the ligature name to `Icon.tsx`.
2. Re-request the subset from Google Fonts with the full list:

   ```sh
   ICONS=add,arrow_forward,block,bolt,check,check_circle,close,code,content_copy,copy_all,delete_forever,done_all,enhanced_encryption,fingerprint,forum,gpp_maybe,key,lock,manage_search,memory,menu_book,monitor_heart,network_check,open_in_new,play_arrow,rocket_launch,schema,search,send,settings,shield_locked,speed,sync,terminal,trending_flat,tune,unfold_more,verified_user,visibility,visibility_off
   UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
   curl -s -A "$UA" \
     "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=$ICONS" -o subset.css
   curl -s -A "$UA" "$(grep -o 'https://[^)]*' subset.css | head -1)" \
     -o apps/web/app/fonts/MaterialSymbolsOutlined.woff2
   ```

   A browser user agent matters here: a generic one makes Google serve
   `format('truetype')` instead of woff2.

3. Confirm every name resolved to a ligature before trusting the result:

   ```sh
   python3 -c "
   from fontTools.ttLib import TTFont
   f = TTFont('apps/web/app/fonts/MaterialSymbolsOutlined.woff2')
   print(len(f.getBestCmap()), 'cmap entries')"
   ```

> A ligature missing from the subset renders as its literal text (e.g.
> `open_in_new`) rather than silently disappearing — so gaps are visible.