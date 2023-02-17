
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
interface Pokemon {
  id: number;
  name: string;
  imageUrl: string;
  baseExperience: number;
  types: string;
  stats: Stat[];
  showDetails: boolean;
  selected: boolean;
  selectedOrange: boolean;
}

interface Stat {
  name: string;
  value: number;
}

@Component({
  selector: 'app-poke-cards',
  templateUrl: './poke-cards.component.html',
  styleUrls: ['./poke-cards.component.css']
})
export class PokeCardsComponent implements OnInit {
  pokemonList: Pokemon[] = [];
  selectedPokemon: Pokemon[] = [];


  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Realiza una solicitud HTTP GET para obtener la lista de los primeros 151 Pokémon
    this.http
      .get<any>(`https://pokeapi.co/api/v2/pokemon?limit=151%27`)
      .subscribe((response) => {
        // Por cada resultado, crea un objeto Pokemon y agrégalo a la lista
        response.results.forEach((result: any, index: number) => {
          const id = index + 1; // El ID es simplemente el índice + 1
          const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
          this.http.get<any>(result.url).subscribe((pokemon) => {
            const types = pokemon.types.map((type: any) => type.type.name);
            this.pokemonList.push({
              id,
              name: result.name,
              imageUrl,
              baseExperience: 0,
              types: '',
              showDetails: false,
              selected: false,
              stats: [],
              selectedOrange: false,
            });
          });
        });
      });
  }

  toggleDetails(pokemon: Pokemon) {
    pokemon.showDetails = !pokemon.showDetails;
    // Si aún no se han cargado las estadísticas, realiza una solicitud HTTP GET para obtenerlas
    if (pokemon.showDetails && pokemon.baseExperience === 0) {
      this.http
        .get<any>(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`)
        .subscribe((response) => {
          pokemon.types = response.types.map((type: any) => type.type.name);
          pokemon.stats = response.stats.map((stat: any) => {
            return {
              name: stat.stat.name,
              value: stat.base_stat,
            };
          });

        });
    }
  }
  selectCard(pokemon: Pokemon) {
    if (this.selectedPokemon.length < 2) {
      pokemon.selected = true;
      pokemon.selectedOrange = true;
      this.selectedPokemon.push(pokemon);
      this.toggleDetails(pokemon);
    } else {
      const deselected = this.selectedPokemon.shift();
      if (deselected) {
        deselected.selected = false;
        deselected.selectedOrange = false;
        this.toggleDetails(deselected);
      }
      pokemon.selected = true;
      pokemon.selectedOrange = true;
      this.selectedPokemon.push(pokemon);
      this.toggleDetails(pokemon);

    }
  }
  iniciarBatalla() {
    // Obtener las cartas seleccionadas
    const cartasSeleccionadas = this.pokemonList.filter(pokemon => pokemon.selected);

    // Verificar que hay exactamente dos cartas seleccionadas
    if (cartasSeleccionadas.length !== 2) {
      console.log('Debe seleccionar exactamente dos cartas para iniciar la batalla.');
      return;
    }

    // Obtener las dos cartas seleccionadas
    const carta1 = cartasSeleccionadas[0];
    const carta2 = cartasSeleccionadas[1];

    // Verificar la efectividad de los tipos de los ataques
    // Verificar que la propiedad types sea un array
    const tipos1 = Array.isArray(carta1.types) ? carta1.types : carta1.types.split(',');
    const tipos2 = Array.isArray(carta2.types) ? carta2.types : carta2.types.split(',');
    let efectividad1 = 1;
    let efectividad2 = 1;

    // Promesas para esperar a que se completen las peticiones
    const promesas1 = tipos1.map(tipo => this.obtenerEfectividadAtaque(tipo, tipos2));
    const promesas2 = tipos2.map(tipo => this.obtenerEfectividadAtaque(tipo, tipos1));

    Promise.all(promesas1).then(async (efectividades) => {
      efectividad1 = await efectividades.reduce(async (total, actual) => {
        const actualEfectividad = await lastValueFrom(actual);
        return await total * actualEfectividad;
      }, Promise.resolve(1));
      console.log(`Iniciando batalla entre ${carta1.name} (ID: ${carta1.id}) y ${carta2.name} (ID: ${carta2.id}).`);
      console.log(`${carta1.name} (ID: ${carta1.id}) tiene una efectividad de ataque de ${efectividad1}`);
      
      Promise.all(promesas2).then(async (efectividades) => {
        efectividad2 = await efectividades.reduce(async (total, actual) => {
          const actualEfectividad = await lastValueFrom(actual);
          return await total * actualEfectividad;
        }, Promise.resolve(1));
        console.log(`${carta2.name} (ID: ${carta2.id}) tiene una efectividad de ataque de ${efectividad2}`);
    
        // Comparar efectividades y establecer el ganador
        let ganador;
        if (efectividad1 > efectividad2) {
          
          ganador = carta1;
        } else if (efectividad2 > efectividad1) {
       
          ganador = carta2;
          console.log(ganador.name)
        } else {
          ganador = 'Empate';
        }
        if (typeof ganador === 'string') {
         alert(`El ganador es: ${ganador}`);
        } else if (ganador && ganador.name) {
          alert(`El ganador es: ${ganador.name} (ID: ${ganador.id})`);
        } else {
          alert(`El ganador es desconocido`);
        }
      });
    }).catch((error) => {
      console.error(error);
    });

  }

  obtenerEfectividadAtaque(tipoAtacante: string, tiposDefensores: string[]): Observable<number> {
    const url = `https://pokeapi.co/api/v2/type/${tipoAtacante}`;
    return new Observable((observer) => {
      this.http.get<any>(url).subscribe({
        next: (response) => {
          let efectividad = 1;
          response.damage_relations.double_damage_to.forEach((tipo: any) => {
            if (tiposDefensores[0].includes(tipo.name)) {
              efectividad *= 70;

            }
          });
          response.damage_relations.half_damage_to.forEach((tipo: any) => {
            if (tiposDefensores[0].includes(tipo.name)) {
              efectividad *= 30;

            }
          });
          response.damage_relations.no_damage_to.forEach((tipo: any) => {
            if (tiposDefensores[0].includes(tipo.name)) {
              efectividad *= 0;

            }
          });
          observer.next(efectividad);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }
  // obtenerEfectividadAtaque2(tipoAtacante: string, tiposDefensores: string[]): Observable<number> {
  //   const url = `https://pokeapi.co/api/v2/type/${tipoAtacante}`;
  //   return new Observable((observer) => {
  //     this.http.get<any>(url).subscribe({
  //       next: (response) => {
  //         let efectividad = 1;
  //         response.damage_relations.double_damage_from.forEach((tipo: any) => {
  //           if (tiposDefensores[0].includes(tipo.name)) {
  //             efectividad *= -70;
  //             console.log(efectividad)
  //           }
  //         });
  //         response.damage_relations.half_damage_from.forEach((tipo: any) => {
  //           if (tiposDefensores[0].includes(tipo.name)) {
  //             efectividad *= -30;
  //             console.log(efectividad)
  //           }
  //         });
  //         response.damage_relations.no_damage_from.forEach((tipo: any) => {
  //           if (tiposDefensores[0].includes(tipo.name)) {
  //             efectividad *= 0;

  //           }
  //         });
  //         observer.next(efectividad);
  //         observer.complete();
  //       },
  //       error: (error) => {
  //         observer.error(error);
  //       }
  //     });
  //   });
  // }

}
