// Serveur de la table de cartes : état de chaque table en mémoire, synchronisé par WebSocket.
// Le serveur est l'autorité : il n'envoie à chaque joueur que SA main (les autres ne voient que le nombre de cartes).
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
// La page est intégrée dans ce fichier : plus besoin de dossier public ni d'index.html
const PAGE = Buffer.from('PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImZyIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLCB2aWV3cG9ydC1maXQ9Y292ZXIiPgo8bWV0YSBuYW1lPSJ0aGVtZS1jb2xvciIgY29udGVudD0iIzBlMTcxNCI+Cjx0aXRsZT5UYWJsZSBkZSBjYXJ0ZXM8L3RpdGxlPgo8c3R5bGU+Cjpyb290ey0tbmlnaHQ6IzBlMTcxNDstLXBhbmVsOiMxNzIzMWU7LS1saW5lOiMyYTNjMzQ7LS10eDojZWZlYWRiOy0tbXU6Izk4YTY5ZDstLWJyYXNzOiNkOWE0NDE7LS1mZWx0MTojMjY3NzRkOy0tZmVsdDI6IzE0NTAzYTstLXdvb2Q6IzZiNGEyYjstLWl2b3J5OiNmYmY4ZWY7LS1yZWQ6I2IzMjYxZTtjb2xvci1zY2hlbWU6ZGFya30KKntib3gtc2l6aW5nOmJvcmRlci1ib3h9Cmh0bWwsYm9keXttYXJnaW46MH0KYm9keXtiYWNrZ3JvdW5kOnZhcigtLW5pZ2h0KTtjb2xvcjp2YXIoLS10eCk7Zm9udDoxNnB4LzEuNCBzeXN0ZW0tdWksLWFwcGxlLXN5c3RlbSwiU2Vnb2UgVUkiLFJvYm90byxzYW5zLXNlcmlmO3BhZGRpbmc6bWF4KDEwcHgsZW52KHNhZmUtYXJlYS1pbnNldC10b3ApKSAxMHB4IG1heCgxMHB4LGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSk7bWF4LXdpZHRoOjU2MHB4O21hcmdpbjowIGF1dG87bWluLWhlaWdodDoxMDB2aH0KYnV0dG9uLGlucHV0e2ZvbnQ6aW5oZXJpdDtjb2xvcjppbmhlcml0fQo6Zm9jdXMtdmlzaWJsZXtvdXRsaW5lOjNweCBzb2xpZCB2YXIoLS1icmFzcyk7b3V0bGluZS1vZmZzZXQ6MnB4fQouYnRue2JhY2tncm91bmQ6dmFyKC0tYnJhc3MpO2NvbG9yOiMxZDE1MDM7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MTFweCAxNnB4O2ZvbnQtd2VpZ2h0OjcwMH0KLmJ0bi5hbHR7YmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS10eCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKX0KLmJ0bi5zbXtwYWRkaW5nOjhweCAxMnB4O2ZvbnQtc2l6ZToxNHB4fQoucm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2ZsZXgtd3JhcDp3cmFwO2FsaWduLWl0ZW1zOmNlbnRlcn0KaW5wdXRbdHlwZT10ZXh0XSxpbnB1dFt0eXBlPW51bWJlcl17YmFja2dyb3VuZDp2YXIoLS1uaWdodCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzoxMXB4O21pbi13aWR0aDowO2ZsZXg6MX0KaW5wdXRbdHlwZT1udW1iZXJde2ZsZXg6MCAwIDY0cHh9Ci5wYW5lbHtiYWNrZ3JvdW5kOnZhcigtLXBhbmVsKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6MTRweDtwYWRkaW5nOjE0cHg7bWFyZ2luLWJvdHRvbToxMHB4fQpoMXtmb250OjcwMCAyNnB4LzEuMTUgR2VvcmdpYSwiVGltZXMgTmV3IFJvbWFuIixzZXJpZjttYXJnaW46MThweCAwIDZweH0KcC5sZWFke2NvbG9yOnZhcigtLW11KTttYXJnaW46MCAwIDE2cHh9CltoaWRkZW5de2Rpc3BsYXk6bm9uZSFpbXBvcnRhbnR9CiNjb25ue2JhY2tncm91bmQ6IzVhMmExNDtjb2xvcjojZmZkOWMyO3RleHQtYWxpZ246Y2VudGVyO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjZweDtmb250LXNpemU6MTRweDttYXJnaW4tYm90dG9tOjhweH0KI3RvcHtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7bWFyZ2luLWJvdHRvbTo0cHh9CiN0b3AgYntmb250OjcwMCAxNXB4IEdlb3JnaWEsc2VyaWY7bGV0dGVyLXNwYWNpbmc6LjA0ZW19CiNzdGFnZXtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDoxMDAlO2FzcGVjdC1yYXRpbzoxLzEuMTttYXgtaGVpZ2h0OjQ3MHB4fQojZmVsdHtwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDo2JSAyJTtib3JkZXItcmFkaXVzOjUwJTtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudChlbGxpcHNlIGF0IGNlbnRlcix2YXIoLS1mZWx0MSkgMCUsIzFiNjE0MCA2NSUsdmFyKC0tZmVsdDIpIDEwMCUpO2JvcmRlcjo3cHggc29saWQgdmFyKC0td29vZCk7Ym94LXNoYWRvdzppbnNldCAwIDAgMzRweCAjMDAwNywwIDhweCAyMnB4ICMwMDA2fQojY2VudGVye3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6NTAlO3RvcDo1MCU7dHJhbnNmb3JtOnRyYW5zbGF0ZSgtNTAlLC01MCUpO3dpZHRoOjU4JTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweH0KI3BpbGV7ZGlzcGxheTpmbGV4O2ZsZXgtd3JhcDp3cmFwO2p1c3RpZnktY29udGVudDpjZW50ZXI7bWluLWhlaWdodDo2MnB4O3BhZGRpbmctbGVmdDoyMHB4fQojcGlsZSAuY2FyZHttYXJnaW4tbGVmdDotMjBweH0KI3BpbGUgLmVtcHR5e2NvbG9yOiNmZmZmZmZiMDtwYWRkaW5nLWxlZnQ6MH0KLnNlYXR7cG9zaXRpb246YWJzb2x1dGU7dHJhbnNmb3JtOnRyYW5zbGF0ZSgtNTAlLC01MCUpO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47YWxpZ24taXRlbXM6Y2VudGVyO2dhcDozcHg7d2lkdGg6MzQlfQoubm17YmFja2dyb3VuZDojMDAwYjtjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6OTlweDtwYWRkaW5nOjFweCA5cHg7Zm9udC1zaXplOjEycHg7bWF4LXdpZHRoOjEwMCU7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7d2hpdGUtc3BhY2U6bm93cmFwfQoubm0ub2Zme29wYWNpdHk6LjU1fQouZmFue2Rpc3BsYXk6ZmxleDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmctbGVmdDoxNHB4O21pbi1oZWlnaHQ6MzhweH0KLmZhbiAuY2FyZHttYXJnaW4tbGVmdDotMTRweH0KLmNhcmR7d2lkdGg6NDZweDtoZWlnaHQ6NjZweDtib3JkZXItcmFkaXVzOjdweDtib3JkZXI6MXB4IHNvbGlkICNiOWI0YTQ7YmFja2dyb3VuZDp2YXIoLS1pdm9yeSk7Y29sb3I6IzFiMWIxOTtkaXNwbGF5OmZsZXg7ZmxleC1kaXJlY3Rpb246Y29sdW1uO2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2ZvbnQ6NzAwIDE3cHgvMS4wNSBHZW9yZ2lhLCJUaW1lcyBOZXcgUm9tYW4iLHNlcmlmO3BhZGRpbmc6MDtmbGV4OjAgMCBhdXRvO2JveC1zaGFkb3c6MCAxcHggM3B4ICMwMDA2O3Bvc2l0aW9uOnJlbGF0aXZlfQouY2FyZCBpe2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtc2l6ZToxOXB4fQouY2FyZC5yZWR7Y29sb3I6dmFyKC0tcmVkKX0KLmNhcmQuYmFja3tiYWNrZ3JvdW5kOnJlcGVhdGluZy1saW5lYXItZ3JhZGllbnQoNDVkZWcsIzJjNGE3YywjMmM0YTdjIDVweCwjNDg2YmEzIDVweCwjNDg2YmEzIDEwcHgpO2JvcmRlcjoycHggc29saWQgI2ZmZn0KLmNhcmQubWluaXt3aWR0aDoyNnB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6NXB4O2JvcmRlci13aWR0aDoxcHh9Ci5jYXJkLmhpZDo6YWZ0ZXJ7Y29udGVudDoi8J+ZiCI7cG9zaXRpb246YWJzb2x1dGU7dG9wOi03cHg7cmlnaHQ6LTZweDtmb250LXNpemU6MTNweH0KLmNhcmQuc2Vse3RyYW5zZm9ybTp0cmFuc2xhdGVZKC0xMnB4KTtib3gtc2hhZG93OjAgMCAwIDNweCB2YXIoLS1icmFzcyksMCA1cHggMTJweCAjMDAwODt6LWluZGV4OjN9CiNkZWNre2JveC1zaGFkb3c6MnB4IDJweCAwICNmZmY4LDRweCA0cHggMCAjMDAwMywwIDJweCA2cHggIzAwMDd9Ci5iYWRnZXtwb3NpdGlvbjphYnNvbHV0ZTtib3R0b206LTlweDtyaWdodDotOXB4O2JhY2tncm91bmQ6IzAwMGQ7Y29sb3I6I2ZmZjtib3JkZXItcmFkaXVzOjk5cHg7Zm9udDo2MDAgMTFweCBzeXN0ZW0tdWk7cGFkZGluZzoxcHggNnB4fQojYmFye2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7bWluLWhlaWdodDo0MHB4O21hcmdpbjoycHggMH0KI21lTGFiZWx7dGV4dC1hbGlnbjpjZW50ZXI7Zm9udC1zaXplOjEzcHg7Y29sb3I6dmFyKC0tbXUpfQojaGFuZHtkaXNwbGF5OmZsZXg7b3ZlcmZsb3cteDphdXRvO3BhZGRpbmc6MTZweCAxOHB4IDhweDttaW4taGVpZ2h0OjEwNHB4O2p1c3RpZnktY29udGVudDpzYWZlIGNlbnRlcn0KI2hhbmQgLmNhcmR7d2lkdGg6NTZweDtoZWlnaHQ6ODBweDtmb250LXNpemU6MjFweDttYXJnaW4tbGVmdDotMTZweDt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTJzfQojaGFuZCAuY2FyZDpmaXJzdC1jaGlsZHttYXJnaW4tbGVmdDowfQojaGFuZCAuY2FyZCBpe2ZvbnQtc2l6ZToyM3B4fQouaGludHtjb2xvcjp2YXIoLS1tdSk7Zm9udC1zaXplOjEycHg7dGV4dC1hbGlnbjpjZW50ZXI7bWFyZ2luOjJweCAwIDEwcHh9Ci5lbXB0eXtjb2xvcjp2YXIoLS1tdSk7Zm9udC1zaXplOjEzcHg7YWxpZ24tc2VsZjpjZW50ZXJ9CmRldGFpbHN7YmFja2dyb3VuZDp2YXIoLS1wYW5lbCk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lKTtib3JkZXItcmFkaXVzOjE0cHg7cGFkZGluZzoxMXB4IDE0cHg7bWFyZ2luLWJvdHRvbToxMHB4fQpzdW1tYXJ5e2ZvbnQtd2VpZ2h0OjYwMDtjdXJzb3I6cG9pbnRlcn0KbGFiZWwuY2hre2Rpc3BsYXk6ZmxleDtnYXA6OHB4O2FsaWduLWl0ZW1zOmNlbnRlcjtmb250LXNpemU6MTRweDtjb2xvcjp2YXIoLS1tdSl9CiNlcnJ7Y29sb3I6I2ZmYjRhODtmb250LXNpemU6MTRweDttYXJnaW4tdG9wOjhweH0KQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOnJlZHVjZSl7Knt0cmFuc2l0aW9uOm5vbmUhaW1wb3J0YW50fX0KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KCjxkaXYgaWQ9ImhvbWUiIGhpZGRlbj4KICA8aDE+VW5lIHRhYmxlIGRlIGNhcnRlcyBkYW5zIHRhIHBvY2hlPC9oMT4KICA8cCBjbGFzcz0ibGVhZCI+Q3LDqWUgdW5lIHRhYmxlLCBlbnZvaWUgbGUgbGllbiDDoCB0ZXMgYW1pcyA6IHRvdXQgbGUgbW9uZGUgam91ZSBhdmVjIGxlIG3Dqm1lIGpldSwgc3VyIHNvbiB0w6lsw6lwaG9uZS4gUGFzIGRlIGNvbXB0ZSwgcGFzIGRlIHLDqGdsZXMgaW1wb3PDqWVzLjwvcD4KICA8ZGl2IGNsYXNzPSJwYW5lbCI+CiAgICA8YnV0dG9uIGNsYXNzPSJidG4iIGlkPSJjcmVhdGUiPkNyw6llciB1bmUgdGFibGU8L2J1dHRvbj4KICAgIDxkaXYgY2xhc3M9InJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGlucHV0IHR5cGU9InRleHQiIGlkPSJjb2RlIiBwbGFjZWhvbGRlcj0iQ29kZSBk4oCZdW5lIHRhYmxlIiBtYXhsZW5ndGg9IjgiIGF1dG9jYXBpdGFsaXplPSJjaGFyYWN0ZXJzIj48YnV0dG9uIGNsYXNzPSJidG4gYWx0IiBpZD0iZ29Db2RlIj5SZWpvaW5kcmU8L2J1dHRvbj48L2Rpdj4KICA8L2Rpdj4KPC9kaXY+Cgo8ZGl2IGlkPSJhc2siIGhpZGRlbj4KICA8aDE+VGFibGUgPHNwYW4gaWQ9ImFza0NvZGUiPjwvc3Bhbj48L2gxPgogIDxwIGNsYXNzPSJsZWFkIj5Db21tZW50IHTigJlhcHBlbGxlLXQtb24gYXV0b3VyIGRlIGxhIHRhYmxlID88L3A+CiAgPGRpdiBjbGFzcz0icGFuZWwgcm93Ij48aW5wdXQgdHlwZT0idGV4dCIgaWQ9Im5hbWUiIHBsYWNlaG9sZGVyPSJUb24gcHLDqW5vbSIgbWF4bGVuZ3RoPSIxNCIgYXV0b2NvbXBsZXRlPSJnaXZlbi1uYW1lIj48YnV0dG9uIGNsYXNzPSJidG4iIGlkPSJzaXQiPlPigJlhc3Nlb2lyPC9idXR0b24+PC9kaXY+CjwvZGl2PgoKPGRpdiBpZD0iZ2FtZSIgaGlkZGVuPgogIDxkaXYgaWQ9ImNvbm4iIGhpZGRlbj5Db25uZXhpb24gcGVyZHVlLCByZWNvbm5leGlvbuKApjwvZGl2PgogIDxkaXYgaWQ9InRvcCI+PGI+VEFCTEUgPHNwYW4gaWQ9InJvb21Db2RlIj48L3NwYW4+PC9iPjxidXR0b24gY2xhc3M9ImJ0biBhbHQgc20iIGlkPSJpbnZpdGUiPkludml0ZXI8L2J1dHRvbj48L2Rpdj4KICA8ZGl2IGlkPSJzdGFnZSI+CiAgICA8ZGl2IGlkPSJmZWx0Ij48L2Rpdj4KICAgIDxkaXYgaWQ9ImNlbnRlciI+PGJ1dHRvbiBjbGFzcz0iY2FyZCBiYWNrIiBpZD0iZGVjayIgZGF0YS1hPSJkcmF3IiBhcmlhLWxhYmVsPSJQaW9jaGVyIHVuZSBjYXJ0ZSI+PC9idXR0b24+PGRpdiBpZD0icGlsZSI+PC9kaXY+PC9kaXY+CiAgICA8ZGl2IGlkPSJzZWF0cyI+PC9kaXY+CiAgPC9kaXY+CiAgPGRpdiBpZD0iYmFyIj48L2Rpdj4KICA8ZGl2IGlkPSJtZUxhYmVsIj48L2Rpdj4KICA8ZGl2IGlkPSJoYW5kIj48L2Rpdj4KICA8cCBjbGFzcz0iaGludCI+VG91Y2hlIGxhIHBpb2NoZSBwb3VyIHBpb2NoZXIuIFRvdWNoZSB1bmUgY2FydGUgcG91ciBsYSBzw6lsZWN0aW9ubmVyLjwvcD4KICA8ZGV0YWlscz4KICAgIDxzdW1tYXJ5PkFjdGlvbnMgZGUgbGEgcGFydGllPC9zdW1tYXJ5PgogICAgPGRpdiBjbGFzcz0icm93IiBzdHlsZT0ibWFyZ2luOjEycHggMCA4cHgiPjxpbnB1dCB0eXBlPSJudW1iZXIiIGlkPSJuIiBtaW49IjEiIG1heD0iMjAiIHZhbHVlPSI1IiBhcmlhLWxhYmVsPSJOb21icmUgZGUgY2FydGVzIj48YnV0dG9uIGNsYXNzPSJidG4iIGRhdGEtYT0iZGVhbCI+RGlzdHJpYnVlciDDoCB0b3VzPC9idXR0b24+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJyb3ciPgogICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYWx0IHNtIiBkYXRhLWE9ImdhdGhlciI+UmFtYXNzZXIgbGEgdGFibGU8L2J1dHRvbj4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCBzbSIgZGF0YS1hPSJzaHVmZmxlIj5Nw6lsYW5nZXIgbGEgcGlvY2hlPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+CiAgICAgIDxsYWJlbCBjbGFzcz0iY2hrIj48aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJqb2siIGNoZWNrZWQ+IEF2ZWMgbGVzIDIgam9rZXJzPC9sYWJlbD4KICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCBzbSIgZGF0YS1hPSJyZXNldCI+Tm91dmVsbGUgcGFydGllPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InJvdyIgc3R5bGU9Im1hcmdpbi10b3A6MTJweCI+PGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCBzbSIgaWQ9ImxlYXZlIj5RdWl0dGVyIGxhIHRhYmxlPC9idXR0b24+PC9kaXY+CiAgPC9kZXRhaWxzPgogIDxkaXYgaWQ9ImVyciIgaGlkZGVuPjwvZGl2Pgo8L2Rpdj4KCjxzY3JpcHQ+CmNvbnN0IFNVSVRTPVsn4pmgJywn4pmlJywn4pmmJywn4pmjJ10sUkFOS1M9WydBJywnMicsJzMnLCc0JywnNScsJzYnLCc3JywnOCcsJzknLCcxMCcsJ0onLCdRJywnSyddOwpjb25zdCAkPWlkPT5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7CmNvbnN0IGVzYz10PT5TdHJpbmcodCkucmVwbGFjZSgvWyY8PiJdL2csYz0+KHsnJic6JyZhbXA7JywnPCc6JyZsdDsnLCc+JzonJmd0OycsJyInOicmcXVvdDsnfVtjXSkpOwpjb25zdCBtZW09e307CmNvbnN0IHN0b3JlPXtnZXQoayl7dHJ5e3JldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrKXx8bWVtW2tdfHxudWxsfWNhdGNoKGUpe3JldHVybiBtZW1ba118fG51bGx9fSxzZXQoayx2KXttZW1ba109djt0cnl7bG9jYWxTdG9yYWdlLnNldEl0ZW0oayx2KX1jYXRjaChlKXt9fSxkZWwoayl7ZGVsZXRlIG1lbVtrXTt0cnl7bG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oayl9Y2F0Y2goZSl7fX19OwpsZXQgdG9rZW49c3RvcmUuZ2V0KCdjdF90b2tlbicpOwppZighdG9rZW4pe3Rva2VuPShjcnlwdG8ucmFuZG9tVVVJRD9jcnlwdG8ucmFuZG9tVVVJRCgpLnJlcGxhY2UoLy0vZywnJyk6TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikrTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMikrRGF0ZS5ub3coKS50b1N0cmluZygzNikpLnBhZEVuZCgyNCwneCcpO3N0b3JlLnNldCgnY3RfdG9rZW4nLHRva2VuKX0KbGV0IHJvb209KG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKS5nZXQoJ3Jvb20nKXx8JycpLnRvVXBwZXJDYXNlKCkucmVwbGFjZSgvW15BLVowLTldL2csJycpLnNsaWNlKDAsOCk7CmxldCBuYW1lPXN0b3JlLmdldCgnY3RfbmFtZScpfHwnJyx3cz1udWxsLHJldHJ5PTAsUz1udWxsLHNlbD1udWxsLGxlYXZpbmc9ZmFsc2U7CgpmdW5jdGlvbiBzaG93KGlkKXtbJ2hvbWUnLCdhc2snLCdnYW1lJ10uZm9yRWFjaCh4PT4kKHgpLmhpZGRlbj14IT09aWQpfQpmdW5jdGlvbiBzZXRSb29tKGMpe3Jvb209YztoaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCcnLCc/cm9vbT0nK2MpO3JvdXRlKCl9CmZ1bmN0aW9uIHJvdXRlKCl7CiAgaWYoIXJvb20pe3Nob3coJ2hvbWUnKTtyZXR1cm59CiAgaWYoIW5hbWUpeyQoJ2Fza0NvZGUnKS50ZXh0Q29udGVudD1yb29tO3Nob3coJ2FzaycpO3JldHVybn0KICAkKCdyb29tQ29kZScpLnRleHRDb250ZW50PXJvb207c2hvdygnZ2FtZScpO2Nvbm5lY3QoKTsKfQokKCdjcmVhdGUnKS5vbmNsaWNrPSgpPT57Y29uc3QgTD0nQUJDREVGR0hKS0xNTlBRUlNUVVZXWFlaJztsZXQgYz0nJztmb3IobGV0IGk9MDtpPDQ7aSsrKWMrPUxbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKkwubGVuZ3RoKV07c2V0Um9vbShjKX07CiQoJ2dvQ29kZScpLm9uY2xpY2s9KCk9Pntjb25zdCBjPSQoJ2NvZGUnKS52YWx1ZS50b1VwcGVyQ2FzZSgpLnJlcGxhY2UoL1teQS1aMC05XS9nLCcnKTtpZihjKXNldFJvb20oYyl9OwokKCdzaXQnKS5vbmNsaWNrPSgpPT57Y29uc3Qgbj0kKCduYW1lJykudmFsdWUudHJpbSgpO2lmKCFuKXJldHVybjtuYW1lPW47c3RvcmUuc2V0KCdjdF9uYW1lJyxuKTtyb3V0ZSgpfTsKJCgnbmFtZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLGU9PntpZihlLmtleT09PSdFbnRlcicpJCgnc2l0JykuY2xpY2soKX0pOwokKCdpbnZpdGUnKS5vbmNsaWNrPWFzeW5jKCk9PnsKICBjb25zdCB1cmw9bG9jYXRpb24ub3JpZ2luKycvP3Jvb209Jytyb29tOwogIHRyeXtpZihuYXZpZ2F0b3Iuc2hhcmUpe2F3YWl0IG5hdmlnYXRvci5zaGFyZSh7dGl0bGU6J1RhYmxlIGRlIGNhcnRlcycsdGV4dDonUmVqb2lucyBtYSB0YWJsZSBkZSBjYXJ0ZXMnLHVybH0pO3JldHVybn19Y2F0Y2goZSl7cmV0dXJufQogIHRyeXthd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh1cmwpOyQoJ2ludml0ZScpLnRleHRDb250ZW50PSdMaWVuIGNvcGnDqSc7c2V0VGltZW91dCgoKT0+JCgnaW52aXRlJykudGV4dENvbnRlbnQ9J0ludml0ZXInLDIwMDApfWNhdGNoKGUpe3Byb21wdCgnQ29waWUgY2UgbGllbiA6Jyx1cmwpfQp9OwokKCdsZWF2ZScpLm9uY2xpY2s9KCk9PntpZighY29uZmlybSgnUXVpdHRlciBsYSB0YWJsZSA/IFRlcyBjYXJ0ZXMgcmV0b3VybmVudCBkYW5zIGxhIHBpb2NoZS4nKSlyZXR1cm47bGVhdmluZz10cnVlO3NlbmQoe3Q6J2xlYXZlJ30pO3RyeXt3cyYmd3MuY2xvc2UoKX1jYXRjaChlKXt9cm9vbT0nJztTPW51bGw7aGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwnJywnLycpO3JvdXRlKCl9OwoKZnVuY3Rpb24gc2VuZChvKXtpZih3cyYmd3MucmVhZHlTdGF0ZT09PTEpd3Muc2VuZChKU09OLnN0cmluZ2lmeShvKSl9CmZ1bmN0aW9uIGNvbm5lY3QoKXsKICBpZih3cyYmKHdzLnJlYWR5U3RhdGU9PT0wfHx3cy5yZWFkeVN0YXRlPT09MSkpcmV0dXJuOwogIGxlYXZpbmc9ZmFsc2U7CiAgd3M9bmV3IFdlYlNvY2tldCgobG9jYXRpb24ucHJvdG9jb2w9PT0naHR0cHM6Jz8nd3NzOi8vJzond3M6Ly8nKStsb2NhdGlvbi5ob3N0KTsKICB3cy5vbm9wZW49KCk9PntyZXRyeT0wOyQoJ2Nvbm4nKS5oaWRkZW49dHJ1ZTtzZW5kKHt0Oidqb2luJyxyb29tLHRva2VuLG5hbWV9KX07CiAgd3Mub25tZXNzYWdlPWU9PntsZXQgbTt0cnl7bT1KU09OLnBhcnNlKGUuZGF0YSl9Y2F0Y2goeCl7cmV0dXJufQogICAgaWYobS50PT09J3N0YXRlJyl7Uz1tOyQoJ2VycicpLmhpZGRlbj10cnVlO3JlbmRlcigpfQogICAgZWxzZSBpZihtLnQ9PT0nZXJyJyl7JCgnZXJyJykudGV4dENvbnRlbnQ9bS5tc2c7JCgnZXJyJykuaGlkZGVuPWZhbHNlfX07CiAgd3Mub25jbG9zZT0oKT0+e2lmKGxlYXZpbmd8fCFyb29tKXJldHVybjskKCdjb25uJykuaGlkZGVuPWZhbHNlO3NldFRpbWVvdXQoY29ubmVjdCxNYXRoLm1pbig4MDAqTWF0aC5wb3coMixyZXRyeSsrKSw4MDAwKSl9Owp9CmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCgpPT57aWYoIWRvY3VtZW50LmhpZGRlbiYmcm9vbSYmbmFtZSYmKCF3c3x8d3MucmVhZHlTdGF0ZT4xKSljb25uZWN0KCl9KTsKCmZ1bmN0aW9uIGZhY2UoYyxleHRyYSxhLGQpewogIGNvbnN0IGF0PWE/YCBkYXRhLWE9IiR7YX0iICR7ZH1gOicnOwogIGlmKGM+PTUyKXJldHVybiBgPGJ1dHRvbiBjbGFzcz0iY2FyZCR7ZXh0cmF8fCcnfSIke2F0fT48Yj5Kb2s8L2I+PGk+8J+DjzwvaT48L2J1dHRvbj5gOwogIGNvbnN0IHM9TWF0aC5mbG9vcihjLzEzKSxyZWQ9cz09PTF8fHM9PT0yOwogIHJldHVybiBgPGJ1dHRvbiBjbGFzcz0iY2FyZCR7cmVkPycgcmVkJzonJ30ke2V4dHJhfHwnJ30iJHthdH0+PGI+JHtSQU5LU1tjJTEzXX08L2I+PGk+JHtTVUlUU1tzXX08L2k+PC9idXR0b24+YH0KCmZ1bmN0aW9uIHJlbmRlcigpewogIGlmKCFTKXJldHVybjsKICAkKCdkZWNrJykuaW5uZXJIVE1MPWA8c3BhbiBjbGFzcz0iYmFkZ2UiPiR7Uy5kZWNrfTwvc3Bhbj5gOwogIGNvbnN0IG1pbmU9Uy5oYW5kLnNsaWNlKCkuc29ydCgoYSxiKT0+YS1iKTsKICBpZihzZWwmJnNlbC5rPT09J2gnJiYhbWluZS5pbmNsdWRlcyhzZWwudikpc2VsPW51bGw7CiAgaWYoc2VsJiZzZWwuaz09PSdwJyYmIVMucGlsZVtzZWwudl0pc2VsPW51bGw7CiAgJCgncGlsZScpLmlubmVySFRNTD1TLnBpbGUubGVuZ3RoP1MucGlsZS5tYXAoeD0+ewogICAgY29uc3Qgb249c2VsJiZzZWwuaz09PSdwJyYmc2VsLnY9PT14Lmk/JyBzZWwnOicnOwogICAgaWYoeC5jPT09bnVsbClyZXR1cm4gYDxidXR0b24gY2xhc3M9ImNhcmQgYmFjayR7b259IiBkYXRhLWE9InNlbHAiIGRhdGEtaT0iJHt4Lml9IiBhcmlhLWxhYmVsPSJDYXJ0ZSBmYWNlIGNhY2jDqWUiPjwvYnV0dG9uPmA7CiAgICByZXR1cm4gZmFjZSh4LmMsKHgudXA/Jyc6JyBoaWQnKStvbiwnc2VscCcsYGRhdGEtaT0iJHt4Lml9ImApfSkuam9pbignJyk6JzxzcGFuIGNsYXNzPSJlbXB0eSI+VGFibGUgdmlkZTwvc3Bhbj4nOwogIGNvbnN0IG90aGVycz1TLnBsYXllcnMuZmlsdGVyKHA9PnAuaWQhPT1TLm1lKSxtPW90aGVycy5sZW5ndGg7CiAgJCgnc2VhdHMnKS5pbm5lckhUTUw9b3RoZXJzLm1hcCgocCxrKT0+ewogICAgY29uc3QgdD0oaysxKS8obSsxKSx4PTUwKzQxKk1hdGguY29zKE1hdGguUEkrTWF0aC5QSSp0KSx5PTUwLTQwKk1hdGguc2luKE1hdGguUEkqdCkrNDsKICAgIHJldHVybiBgPGRpdiBjbGFzcz0ic2VhdCIgc3R5bGU9ImxlZnQ6JHt4fSU7dG9wOiR7eX0lIj48ZGl2IGNsYXNzPSJmYW4iPiR7JzxzcGFuIGNsYXNzPSJjYXJkIGJhY2sgbWluaSI+PC9zcGFuPicucmVwZWF0KE1hdGgubWluKHAubiwxMikpfTwvZGl2PjxzcGFuIGNsYXNzPSJubSR7cC5vbj8nJzonIG9mZid9Ij4ke2VzYyhwLm5hbWUpfSDCtyAke3Aubn0ke3Aub24/Jyc6JyAoYWJzZW50KSd9PC9zcGFuPjwvZGl2PmB9KS5qb2luKCcnKTsKICAkKCdoYW5kJykuaW5uZXJIVE1MPW1pbmUubGVuZ3RoP21pbmUubWFwKGM9PmZhY2UoYyxzZWwmJnNlbC5rPT09J2gnJiZzZWwudj09PWM/JyBzZWwnOicnLCdzZWxoJyxgZGF0YS1jPSIke2N9ImApKS5qb2luKCcnKTonPHNwYW4gY2xhc3M9ImVtcHR5Ij5UYSBtYWluIGVzdCB2aWRlPC9zcGFuPic7CiAgJCgnbWVMYWJlbCcpLnRleHRDb250ZW50PWAke25hbWV9IChtb2kpIMK3ICR7bWluZS5sZW5ndGh9IGNhcnRlJHttaW5lLmxlbmd0aD4xPydzJzonJ31gOwogICQoJ2pvaycpLmNoZWNrZWQ9Uy5qb2tlcnM7CiAgbGV0IGJhcj0nJzsKICBpZihzZWwmJnNlbC5rPT09J2gnKWJhcj1gPGJ1dHRvbiBjbGFzcz0iYnRuIiBkYXRhLWE9InBsYXkiIGRhdGEtdXA9IjEiPlBvc2VyPC9idXR0b24+PGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCIgZGF0YS1hPSJwbGF5IiBkYXRhLXVwPSIwIj5Qb3NlciBmYWNlIGNhY2jDqWU8L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJidG4gYWx0IiBkYXRhLWE9ImNhbmNlbCI+QW5udWxlcjwvYnV0dG9uPmA7CiAgaWYoc2VsJiZzZWwuaz09PSdwJyl7Y29uc3QgeD1TLnBpbGVbc2VsLnZdO2Jhcj1gPGJ1dHRvbiBjbGFzcz0iYnRuIiBkYXRhLWE9InRha2UiPlJlcHJlbmRyZTwvYnV0dG9uPiR7eC51cD8nJzonPGJ1dHRvbiBjbGFzcz0iYnRuIGFsdCIgZGF0YS1hPSJmbGlwIj5SZXRvdXJuZXI8L2J1dHRvbj4nfTxidXR0b24gY2xhc3M9ImJ0biBhbHQiIGRhdGEtYT0iY2FuY2VsIj5Bbm51bGVyPC9idXR0b24+YH0KICAkKCdiYXInKS5pbm5lckhUTUw9YmFyOwp9Cgpkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsZT0+ewogIGNvbnN0IGI9ZS50YXJnZXQuY2xvc2VzdCgnW2RhdGEtYV0nKTtpZighYilyZXR1cm47CiAgY29uc3QgYT1iLmRhdGFzZXQuYTsKICBpZihhPT09J3NlbGgnKXtjb25zdCBjPStiLmRhdGFzZXQuYztzZWw9c2VsJiZzZWwuaz09PSdoJyYmc2VsLnY9PT1jP251bGw6e2s6J2gnLHY6Y307cmVuZGVyKCk7cmV0dXJufQogIGlmKGE9PT0nc2VscCcpe2NvbnN0IGk9K2IuZGF0YXNldC5pO3NlbD1zZWwmJnNlbC5rPT09J3AnJiZzZWwudj09PWk/bnVsbDp7azoncCcsdjppfTtyZW5kZXIoKTtyZXR1cm59CiAgaWYoYT09PSdjYW5jZWwnKXtzZWw9bnVsbDtyZW5kZXIoKTtyZXR1cm59CiAgaWYoYT09PSdwbGF5JyYmc2VsJiZzZWwuaz09PSdoJyl7c2VuZCh7dDoncGxheScsYzpzZWwudix1cDpiLmRhdGFzZXQudXA9PT0nMSd9KTtzZWw9bnVsbDtyZXR1cm59CiAgaWYoYT09PSd0YWtlJyYmc2VsJiZzZWwuaz09PSdwJyl7c2VuZCh7dDondGFrZScsaTpzZWwudn0pO3NlbD1udWxsO3JldHVybn0KICBpZihhPT09J2ZsaXAnJiZzZWwmJnNlbC5rPT09J3AnKXtzZW5kKHt0OidmbGlwJyxpOnNlbC52fSk7c2VsPW51bGw7cmV0dXJufQogIGlmKGE9PT0nZGVhbCcpe3NlbmQoe3Q6J2RlYWwnLG46cGFyc2VJbnQoJCgnbicpLnZhbHVlKXx8MX0pO3JldHVybn0KICBpZihhPT09J3Jlc2V0Jyl7aWYoY29uZmlybSgnUmVtZXR0cmUgdG91dGVzIGxlcyBjYXJ0ZXMgZGFucyBsYSBwaW9jaGUgZXQgbcOpbGFuZ2VyID8nKSlzZW5kKHt0OidyZXNldCcsam9rZXJzOiQoJ2pvaycpLmNoZWNrZWR9KTtyZXR1cm59CiAgaWYoWydkcmF3JywnZ2F0aGVyJywnc2h1ZmZsZSddLmluY2x1ZGVzKGEpKXNlbmQoe3Q6YX0pOwp9KTsKcm91dGUoKTsKPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPgo=', 'base64');

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok v2'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(PAGE);
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const rooms = new Map();

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const newDeck = jokers => shuffle([...Array(jokers ? 54 : 52).keys()]);

function getRoom(code) {
  let r = rooms.get(code);
  if (!r) {
    r = { code, jokers: true, deck: newDeck(true), pile: [], players: [], last: Date.now() };
    rooms.set(code, r);
  }
  return r;
}

function view(room, p) {
  return {
    t: 'state',
    room: room.code,
    jokers: room.jokers,
    deck: room.deck.length,
    // une carte posée face cachée n'est révélée qu'à celui qui l'a posée
    pile: room.pile.map((x, i) => ({ i, up: x.up, c: x.up || x.by === p.pid ? x.c : null })),
    players: room.players.map(q => ({ id: q.pid, name: q.name, n: q.hand.length, on: !!q.ws })),
    me: p.pid,
    hand: p.hand,
  };
}

function broadcast(room) {
  for (const p of room.players) {
    if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(view(room, p)));
  }
}

function act(room, p, m) {
  switch (m.t) {
    case 'draw':
      if (room.deck.length) p.hand.push(room.deck.shift());
      break;
    case 'play': {
      const i = p.hand.indexOf(m.c);
      if (i > -1) { p.hand.splice(i, 1); room.pile.push({ c: m.c, up: m.up !== false, by: p.pid }); }
      break;
    }
    case 'take': {
      const x = room.pile[m.i];
      if (x && (x.up || x.by === p.pid)) { room.pile.splice(m.i, 1); p.hand.push(x.c); }
      break;
    }
    case 'flip': {
      const x = room.pile[m.i];
      if (x) x.up = true;
      break;
    }
    case 'deal': {
      const n = Math.max(1, Math.min(20, (m.n | 0) || 1));
      for (let r = 0; r < n; r++) for (const q of room.players) {
        if (!room.deck.length) return;
        q.hand.push(room.deck.shift());
      }
      break;
    }
    case 'gather':
      room.deck = shuffle(room.deck.concat(room.pile.map(x => x.c)));
      room.pile = [];
      break;
    case 'shuffle':
      room.deck = shuffle(room.deck);
      break;
    case 'reset':
      room.jokers = !!m.jokers;
      room.deck = newDeck(room.jokers);
      room.pile = [];
      room.players.forEach(q => { q.hand = []; });
      break;
  }
}

wss.on('connection', ws => {
  let room = null, me = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'join') {
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code || room) return;
      const token = typeof m.token === 'string' && m.token.length >= 16 && m.token.length <= 64 ? m.token : null;
      if (!token) return;
      const r = getRoom(code);
      let p = r.players.find(q => q.token === token);
      const name = String(m.name || '').trim().slice(0, 14) || 'Joueur';
      if (!p) {
        if (r.players.length >= MAX_PLAYERS) { ws.send(JSON.stringify({ t: 'err', msg: 'Table pleine (8 joueurs maximum).' })); return; }
        p = { pid: crypto.randomBytes(4).toString('hex'), token, name, hand: [], ws: null };
        r.players.push(p);
      } else {
        p.name = name;
        if (p.ws && p.ws !== ws) { try { p.ws.close(); } catch {} }
      }
      p.ws = ws; room = r; me = p; r.last = Date.now();
      broadcast(r);
      return;
    }

    if (!room || !me) return;
    if (m.t === 'leave') {
      room.deck = room.deck.concat(shuffle(me.hand));
      room.players = room.players.filter(q => q !== me);
      me.ws = null; me = null;
      broadcast(room);
      try { ws.close(); } catch {}
      return;
    }
    act(room, me, m);
    room.last = Date.now();
    broadcast(room);
  });

  ws.on('close', () => {
    if (me && me.ws === ws) { me.ws = null; if (room) broadcast(room); }
  });
});

// Coupe les connexions mortes (téléphone endormi, tunnel, etc.)
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 25000);

// Supprime les tables abandonnées depuis plus de 6 h
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.last > 6 * 3600 * 1000 && !r.players.some(p => p.ws)) rooms.delete(code);
  }
}, 10 * 60 * 1000);

server.listen(PORT, () => console.log('Table de cartes sur http://localhost:' + PORT));
